import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { testSuite, expect } from 'manten';
import { execa, execaNode } from 'execa';
import { createFixture } from 'fs-fixture';
import { link } from '../utils/link.js';
import { npmPack } from '../utils/npm-pack.js';

const linkBinPath = path.resolve('./dist/cli.js');

const isWindows = process.platform === 'win32';

// Helper to poll for expected file content (more reliable than fixed delays)
const waitForFileContent = async (
	filePath: string,
	expectedContent: string,
	timeoutMs = 3000,
) => {
	const startTime = Date.now();
	while (Date.now() - startTime < timeoutMs) {
		const content = await fs.readFile(filePath, 'utf8').catch(() => null);
		if (content === expectedContent) {
			return true;
		}
		await setTimeout(50);
	}
	return false;
};

// Helper to kill process and wait for it to exit (prevents file lock issues on Windows)
const killAndWait = async (childProcess: { kill: () => boolean } & Promise<unknown>) => {
	childProcess.kill();
	await childProcess.catch(() => {});
	// Windows needs extra time to release file handles after process termination
	// CI environments are slower, so we use a longer delay
	if (isWindows) {
		await setTimeout(2000);
	}
};

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

		describe('watch mode', ({ test }) => {
			test('relinks on file changes', async () => {
				await using fixture = await createFixture({
					'consuming-package': {
						'package.json': JSON.stringify({ name: 'consuming-package' }),
					},
					'dep-package': {
						'package.json': JSON.stringify({
							name: 'dep-package',
							version: '1.0.0',
						}),
						'index.js': 'module.exports = "original"',
					},
				});

				const consumingPath = fixture.getPath('consuming-package');
				const depPath = fixture.getPath('dep-package');

				// Pack and install
				const tarballPath = await npmPack(depPath);
				await execa('npm', ['install', '--no-save', tarballPath], {
					cwd: consumingPath,
				});

				// Start watch mode
				const watchProcess = execaNode(
					linkBinPath,
					['publish', '--watch', depPath],
					{
						cwd: consumingPath,
						nodePath,
						reject: false,
						env: {},
						extendEnv: false,
						nodeOptions: [],
					},
				);

				// Wait for initial link (longer on Windows)
				await setTimeout(isWindows ? 500 : 200);

				// Verify initial hardlink
				const linkedPath = path.join(consumingPath, 'node_modules/dep-package/index.js');
				const originalStat = await fs.stat(path.join(depPath, 'index.js'));
				const linkedStat = await fs.stat(linkedPath);
				expect(linkedStat.ino).toBe(originalStat.ino);

				// Modify the source file (this breaks the hardlink)
				await fs.writeFile(path.join(depPath, 'index.js'), 'module.exports = "modified"');

				// Poll for the file to be updated (more reliable than fixed delay)
				const updated = await waitForFileContent(
					linkedPath,
					'module.exports = "modified"',
					isWindows ? 5000 : 2000,
				);
				expect(updated).toBe(true);

				// Verify new hardlink was created
				const newOriginalStat = await fs.stat(path.join(depPath, 'index.js'));
				const newLinkedStat = await fs.stat(linkedPath);
				expect(newLinkedStat.ino).toBe(newOriginalStat.ino);

				// Kill process before fixture cleanup (must be awaited here, not in onTestFinish)
				await killAndWait(watchProcess);
			});

			test('skips missing files during relink', async () => {
				await using fixture = await createFixture({
					'consuming-package': {
						'package.json': JSON.stringify({ name: 'consuming-package' }),
					},
					'dep-package': {
						'package.json': JSON.stringify({
							name: 'dep-package',
							version: '1.0.0',
							files: ['index.js', 'optional.js'],
						}),
						'index.js': 'module.exports = "main"',
						'optional.js': 'module.exports = "optional"',
					},
				});

				const consumingPath = fixture.getPath('consuming-package');
				const depPath = fixture.getPath('dep-package');

				// Pack and install
				const tarballPath = await npmPack(depPath);
				await execa('npm', ['install', '--no-save', tarballPath], {
					cwd: consumingPath,
				});

				// Start watch mode
				const watchProcess = execaNode(
					linkBinPath,
					['publish', '--watch', depPath],
					{
						cwd: consumingPath,
						nodePath,
						reject: false,
						env: {},
						extendEnv: false,
						nodeOptions: [],
					},
				);

				// Wait for initial link (longer wait needed for fs.watch to stabilize)
				await setTimeout(isWindows ? 500 : 300);

				// Delete optional.js from source (simulating build deleting files)
				await fs.rm(path.join(depPath, 'optional.js'));

				// Small delay to ensure delete is processed before modification
				await setTimeout(100);

				// Trigger a relink by modifying index.js
				await fs.writeFile(path.join(depPath, 'index.js'), 'module.exports = "updated"');

				// Poll for the file to be updated (use longer timeout for CI reliability)
				const linkedPath = path.join(consumingPath, 'node_modules/dep-package/index.js');
				const updated = await waitForFileContent(
					linkedPath,
					'module.exports = "updated"',
					isWindows ? 5000 : 4000,
				);
				expect(updated).toBe(true);

				// Kill process before fixture cleanup (must be awaited here, not in onTestFinish)
				await killAndWait(watchProcess);
			});

			test('watches multiple packages concurrently', async () => {
				await using fixture = await createFixture({
					'consuming-package': {
						'package.json': JSON.stringify({ name: 'consuming-package' }),
					},
					'dep-a': {
						'package.json': JSON.stringify({
							name: 'dep-a',
							version: '1.0.0',
						}),
						'index.js': 'module.exports = "a-original"',
					},
					'dep-b': {
						'package.json': JSON.stringify({
							name: 'dep-b',
							version: '1.0.0',
						}),
						'index.js': 'module.exports = "b-original"',
					},
				});

				const consumingPath = fixture.getPath('consuming-package');
				const depAPath = fixture.getPath('dep-a');
				const depBPath = fixture.getPath('dep-b');

				// Pack and install both packages
				const [tarballA, tarballB] = await Promise.all([
					npmPack(depAPath),
					npmPack(depBPath),
				]);
				await execa('npm', ['install', '--no-save', tarballA, tarballB], {
					cwd: consumingPath,
				});

				// Start watch mode for both packages
				const watchProcess = execaNode(
					linkBinPath,
					['publish', '--watch', depAPath, depBPath],
					{
						cwd: consumingPath,
						nodePath,
						reject: false,
						env: {},
						extendEnv: false,
						nodeOptions: [],
					},
				);

				// Wait for initial link
				await setTimeout(isWindows ? 500 : 200);

				// Verify both packages were initially linked
				const linkedAPath = path.join(consumingPath, 'node_modules/dep-a/index.js');
				const linkedBPath = path.join(consumingPath, 'node_modules/dep-b/index.js');

				const [statA, statB] = await Promise.all([
					fs.stat(path.join(depAPath, 'index.js')),
					fs.stat(path.join(depBPath, 'index.js')),
				]);
				const [linkedStatA, linkedStatB] = await Promise.all([
					fs.stat(linkedAPath),
					fs.stat(linkedBPath),
				]);
				expect(linkedStatA.ino).toBe(statA.ino);
				expect(linkedStatB.ino).toBe(statB.ino);

				// Modify both source files
				await Promise.all([
					fs.writeFile(path.join(depAPath, 'index.js'), 'module.exports = "a-modified"'),
					fs.writeFile(path.join(depBPath, 'index.js'), 'module.exports = "b-modified"'),
				]);

				// Poll for both files to be updated
				const [updatedA, updatedB] = await Promise.all([
					waitForFileContent(linkedAPath, 'module.exports = "a-modified"', isWindows ? 5000 : 2000),
					waitForFileContent(linkedBPath, 'module.exports = "b-modified"', isWindows ? 5000 : 2000),
				]);
				expect(updatedA).toBe(true);
				expect(updatedB).toBe(true);

				await killAndWait(watchProcess);
			});
		});
	});
});
