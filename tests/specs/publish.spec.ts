import fs from 'node:fs/promises';
import path from 'node:path';
import { testSuite, expect } from 'manten';
import { execa } from 'execa';
import { createFixture } from 'fs-fixture';
import { link } from '../utils/link.js';
import { npmPack } from '../utils/npm-pack.js';

export default testSuite(({ describe }, nodePath: string) => {
	describe('publish mode', ({ describe, test }) => {
		describe('validation', ({ test }) => {
			test('fails when package not in node_modules', async () => {
				await using fixture = await createFixture({
					'consuming-package': {
						'package.json': JSON.stringify({ name: 'consuming-package' }),
					},
					'dep-package': {
						'package.json': JSON.stringify({ name: 'dep-package' }),
						'index.js': 'module.exports = "dep"',
					},
				});

				const consumingPath = fixture.getPath('consuming-package');
				const depPath = fixture.getPath('dep-package');

				// Try to publish-link without installing first
				const result = await link(['publish', depPath], {
					cwd: consumingPath,
					nodePath,
				});

				// Should show error about invalid setup
				expect(result.stderr).toMatch('Error: Package dep-package is not set up');
			});

			test('fails when package symlink points outside node_modules', async () => {
				await using fixture = await createFixture({
					'consuming-package': {
						'package.json': JSON.stringify({ name: 'consuming-package' }),
						node_modules: {},
					},
					'dep-package': {
						'package.json': JSON.stringify({ name: 'dep-package' }),
						'index.js': 'module.exports = "dep"',
					},
				});

				const consumingPath = fixture.getPath('consuming-package');
				const depPath = fixture.getPath('dep-package');

				// Create a symlink that points outside node_modules (like pnpm might do)
				await fs.symlink(
					depPath,
					path.join(consumingPath, 'node_modules/dep-package'),
				);

				const result = await link(['publish', depPath], {
					cwd: consumingPath,
					nodePath,
				});

				// Should show error about invalid setup
				expect(result.stderr).toMatch('Error: Package dep-package is not set up');
			});
		});

		test('hard links', async () => {
			await using fixture = await createFixture('./tests/fixtures/');

			const packageFilesPath = fixture.getPath('package-files');
			const statOriginalFile = await fs.stat(fixture.getPath('package-files/package.json'));
			const tarballPath = await npmPack(packageFilesPath);
			const entryPackagePath = fixture.getPath('package-entry');

			await execa('npm', [
				'install',
				'--no-save',
				tarballPath,
			], {
				cwd: entryPackagePath,
			});

			const statBeforeLink = await fs.stat(path.join(entryPackagePath, 'node_modules/package-files/package.json'));
			expect(statBeforeLink.ino).not.toBe(statOriginalFile.ino);

			const linked = await link([
				'publish',
				packageFilesPath,
			], {
				cwd: entryPackagePath,
				nodePath,
			});
			expect(linked.exitCode).toBe(0);

			// Assert hardlink to be established by comparing inodes
			const statAfterLink = await fs.stat(path.join(entryPackagePath, 'node_modules/package-files/package.json'));
			expect(statAfterLink.ino).toBe(statOriginalFile.ino);
		});

		test('idempotent - running twice works', async () => {
			await using fixture = await createFixture('./tests/fixtures/');

			const packageFilesPath = fixture.getPath('package-files');
			const tarballPath = await npmPack(packageFilesPath);
			const entryPackagePath = fixture.getPath('package-entry');

			await execa('npm', ['install', '--no-save', tarballPath], {
				cwd: entryPackagePath,
			});

			// First link
			const firstLink = await link(['publish', packageFilesPath], {
				cwd: entryPackagePath,
				nodePath,
			});
			expect(firstLink.exitCode).toBe(0);

			// Second link - should work without errors
			const secondLink = await link(['publish', packageFilesPath], {
				cwd: entryPackagePath,
				nodePath,
			});
			expect(secondLink.exitCode).toBe(0);

			// Hardlinks should still be valid
			const statOriginalFile = await fs.stat(fixture.getPath('package-files/package.json'));
			const statLinkedFile = await fs.stat(path.join(entryPackagePath, 'node_modules/package-files/package.json'));
			expect(statLinkedFile.ino).toBe(statOriginalFile.ino);
		});

		test('removes files deleted from source', async () => {
			await using fixture = await createFixture({
				'consuming-package': {
					'package.json': JSON.stringify({ name: 'consuming-package' }),
				},
				'dep-package': {
					'package.json': JSON.stringify({
						name: 'dep-package',
						version: '1.0.0',
						files: ['index.js', 'old-file.js'],
					}),
					'index.js': 'module.exports = "dep"',
					'old-file.js': 'module.exports = "old"',
				},
			});

			const consumingPath = fixture.getPath('consuming-package');
			const depPath = fixture.getPath('dep-package');

			// Pack and install
			const tarballPath = await npmPack(depPath);
			await execa('npm', ['install', '--no-save', tarballPath], {
				cwd: consumingPath,
			});

			// Verify old-file.js exists in node_modules
			const oldFilePath = path.join(consumingPath, 'node_modules/dep-package/old-file.js');
			expect(await fs.access(oldFilePath).then(() => true, () => false)).toBe(true);

			// Delete old-file.js from source (simulating development change)
			await fs.rm(path.join(depPath, 'old-file.js'));

			// Link in publish mode
			const result = await link(['publish', depPath], {
				cwd: consumingPath,
				nodePath,
			});
			expect(result.exitCode).toBe(0);

			// old-file.js should be removed from node_modules
			expect(await fs.access(oldFilePath).then(() => true, () => false)).toBe(false);

			// index.js should still exist
			const indexPath = path.join(consumingPath, 'node_modules/dep-package/index.js');
			expect(await fs.access(indexPath).then(() => true, () => false)).toBe(true);
		});
	});
});
