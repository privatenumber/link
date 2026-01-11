import fs from 'fs/promises';
import path from 'path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { symlink, symlinkBinary, hardlink } from '../../src/utils/symlink.js';

export default testSuite(({ describe }, _nodePath: string) => {
	describe('symlink utilities', ({ describe }) => {
		describe('symlink', ({ test }) => {
			test('creates new symlink', async () => {
				await using fixture = await createFixture({
					'target-file.txt': 'content',
				});

				const targetPath = 'target-file.txt';
				const symlinkPath = path.join(fixture.path, 'link');

				await symlink(targetPath, symlinkPath);

				const stats = await fs.lstat(symlinkPath);
				expect(stats.isSymbolicLink()).toBe(true);

				const linkTarget = await fs.readlink(symlinkPath);
				expect(linkTarget).toBe(targetPath);
			});

			test('replaces existing symlink with different target', async () => {
				await using fixture = await createFixture({
					'target-a.txt': 'content a',
					'target-b.txt': 'content b',
				});

				const symlinkPath = path.join(fixture.path, 'link');

				// Create initial symlink
				await fs.symlink('target-a.txt', symlinkPath);

				// Replace with different target
				await symlink('target-b.txt', symlinkPath);

				const linkTarget = await fs.readlink(symlinkPath);
				expect(linkTarget).toBe('target-b.txt');
			});

			test('skips when symlink already points to same target', async () => {
				await using fixture = await createFixture({
					'target.txt': 'content',
				});

				const symlinkPath = path.join(fixture.path, 'link');
				const targetPath = path.join(fixture.path, 'target.txt');

				// Create initial symlink
				await fs.symlink(targetPath, symlinkPath);

				const statsBefore = await fs.lstat(symlinkPath);

				// Call symlink with same target - should be no-op
				await symlink(targetPath, symlinkPath);

				const statsAfter = await fs.lstat(symlinkPath);

				// Symlink should not have been recreated (same ctime)
				expect(statsAfter.ctimeMs).toBe(statsBefore.ctimeMs);
			});

			test('replaces broken symlink', async () => {
				await using fixture = await createFixture({
					'real-target.txt': 'content',
				});

				const symlinkPath = path.join(fixture.path, 'link');

				// Create broken symlink pointing to non-existent file
				await fs.symlink('non-existent.txt', symlinkPath);

				// Replace with valid target
				await symlink('real-target.txt', symlinkPath);

				const linkTarget = await fs.readlink(symlinkPath);
				expect(linkTarget).toBe('real-target.txt');
			});

			test('replaces directory with symlink', async () => {
				await using fixture = await createFixture({
					'target.txt': 'content',
					'existing-dir': {
						'file.txt': 'nested content',
					},
				});

				const symlinkPath = path.join(fixture.path, 'existing-dir');

				// Verify it's a directory
				const dirStats = await fs.stat(symlinkPath);
				expect(dirStats.isDirectory()).toBe(true);

				// Replace directory with symlink
				await symlink('target.txt', symlinkPath);

				const stats = await fs.lstat(symlinkPath);
				expect(stats.isSymbolicLink()).toBe(true);
			});
		});

		describe('symlinkBinary', ({ test }) => {
			test('creates symlink and sets executable permissions', async () => {
				await using fixture = await createFixture({
					'cli.js': '#!/usr/bin/env node\nconsole.log("hello")',
				});

				const binaryPath = 'cli.js';
				const linkPath = path.join(fixture.path, 'bin-link');

				await symlinkBinary(binaryPath, linkPath);

				const stats = await fs.lstat(linkPath);
				expect(stats.isSymbolicLink()).toBe(true);

				// Check target has executable permissions (Unix only)
				// Windows doesn't have Unix-style executable bits
				if (process.platform !== 'win32') {
					const targetStats = await fs.stat(path.join(fixture.path, 'cli.js'));
					// eslint-disable-next-line no-bitwise
					const isExecutable = (targetStats.mode & 0o111) !== 0;
					expect(isExecutable).toBe(true);
				}
			});

			test('warns when binary target does not exist', async ({ skip }) => {
				// Windows symlinks to non-existent targets may require elevated privileges
				if (process.platform === 'win32') {
					skip('Symlinks to non-existent targets require elevated privileges on Windows');
				}

				await using fixture = await createFixture({});

				const binaryPath = 'non-existent.js';
				const linkPath = path.join(fixture.path, 'bin-link');

				// Capture console.warn
				const warnings: string[] = [];
				const originalWarn = console.warn;
				console.warn = (message: string) => warnings.push(message);

				try {
					await symlinkBinary(binaryPath, linkPath);

					// Symlink should still be created
					const stats = await fs.lstat(linkPath);
					expect(stats.isSymbolicLink()).toBe(true);

					// Warning should have been logged
					expect(warnings.some(w => w.includes('Binary target does not exist'))).toBe(true);
				} finally {
					console.warn = originalWarn;
				}
			});
		});

		describe('hardlink', ({ test }) => {
			test('creates new hardlink', async () => {
				await using fixture = await createFixture({
					'source.txt': 'content',
				});

				const sourcePath = path.join(fixture.path, 'source.txt');
				const hardlinkPath = path.join(fixture.path, 'hardlink.txt');

				await hardlink(sourcePath, hardlinkPath);

				// Both should have same inode
				const sourceStats = await fs.stat(sourcePath);
				const linkStats = await fs.stat(hardlinkPath);
				expect(linkStats.ino).toBe(sourceStats.ino);

				// Content should be the same
				const content = await fs.readFile(hardlinkPath, 'utf8');
				expect(content).toBe('content');
			});

			test('skips when hardlink already exists with same inode', async () => {
				await using fixture = await createFixture({
					'source.txt': 'content',
				});

				const sourcePath = path.join(fixture.path, 'source.txt');
				const hardlinkPath = path.join(fixture.path, 'hardlink.txt');

				// Create initial hardlink
				await fs.link(sourcePath, hardlinkPath);

				const statsBefore = await fs.stat(hardlinkPath);

				// Call hardlink again - should be no-op
				await hardlink(sourcePath, hardlinkPath);

				const statsAfter = await fs.stat(hardlinkPath);

				// Same inode, same ctime (not recreated)
				expect(statsAfter.ino).toBe(statsBefore.ino);
				expect(statsAfter.ctimeMs).toBe(statsBefore.ctimeMs);
			});

			test('replaces existing file with different content', async () => {
				await using fixture = await createFixture({
					'source.txt': 'source content',
					'existing.txt': 'different content',
				});

				const sourcePath = path.join(fixture.path, 'source.txt');
				const existingPath = path.join(fixture.path, 'existing.txt');

				const sourceStats = await fs.stat(sourcePath);
				const existingStatsBefore = await fs.stat(existingPath);

				// Different inodes initially
				expect(existingStatsBefore.ino).not.toBe(sourceStats.ino);

				// Replace with hardlink
				await hardlink(sourcePath, existingPath);

				const existingStatsAfter = await fs.stat(existingPath);

				// Now same inode
				expect(existingStatsAfter.ino).toBe(sourceStats.ino);

				// Content should match source
				const content = await fs.readFile(existingPath, 'utf8');
				expect(content).toBe('source content');
			});

			test('replaces directory with hardlink', async () => {
				await using fixture = await createFixture({
					'source.txt': 'content',
					'existing-dir': {
						'nested.txt': 'nested',
					},
				});

				const sourcePath = path.join(fixture.path, 'source.txt');
				const dirPath = path.join(fixture.path, 'existing-dir');

				// Verify it's a directory
				const dirStats = await fs.stat(dirPath);
				expect(dirStats.isDirectory()).toBe(true);

				// Replace with hardlink
				await hardlink(sourcePath, dirPath);

				const stats = await fs.stat(dirPath);
				expect(stats.isFile()).toBe(true);

				const sourceStats = await fs.stat(sourcePath);
				expect(stats.ino).toBe(sourceStats.ino);
			});
		});
	});
});
