import fs from 'fs/promises';
import path from 'path';
import { testSuite, expect } from 'manten';
import { execa } from 'execa';
import { createFixture } from 'fs-fixture';
import { link } from '../utils';

const npmPack = async (packageDirectory: string) => {
	const pack = await execa('npm', ['pack'], {
		cwd: packageDirectory,
	});
	return path.join(packageDirectory, pack.stdout);
};

export default testSuite(({ describe }, nodePath: string) => {
	describe('publish mode', async ({ test }) => {
		await using fixture = await createFixture('./tests/fixtures/');

		// Prepare tarball to install
		const packageFilesPath = fixture.getPath('package-files');
		const statOriginalFile = await fs.stat(fixture.getPath('package-files/package.json'));
		const tarballPath = await npmPack(packageFilesPath);

		await test('links', async () => {
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

		// await test('watch mode', async () => {
		// 	const entryPackagePath = fixture.getPath('package-entry');
		// 	await execa('npm', [
		// 		'install',
		// 		'--no-save',
		// 		tarballPath,
		// 	], {
		// 		cwd: entryPackagePath,
		// 	});

		// 	const statBeforeLink = await fs.stat(path.join(entryPackagePath, 'node_modules/package-files/package.json'));
		// 	expect(statBeforeLink.ino).not.toBe(statOriginalFile.ino);

		// 	const watchMode = link([
		// 		'publish',
		// 		'--watch',
		// 		packageFilesPath,
		// 	], {
		// 		cwd: entryPackagePath,
		// 		nodePath,
		// 	});

		// 	watchMode.stdout?.on('data', async (data) => {
		// 		console.log('data', data.toString());
		// 	});

		// 	// // Assert hardlink to be established by comparing inodes
		// 	// const statAfterLink = await fs.stat(path.join(entryPackagePath, 'node_modules/package-files/package.json'));
		// 	// expect(statAfterLink.ino).toBe(statOriginalFile.ino);
		// });
	});
});
