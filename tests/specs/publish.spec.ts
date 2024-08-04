import fs from 'node:fs/promises';
import path from 'node:path';
import { testSuite, expect } from 'manten';
import { execa } from 'execa';
import { createFixture } from 'fs-fixture';
import { link } from '../utils/link';
import { streamWaitFor } from '../utils/stream-wait-for';
import { npmPack } from '../utils/npm-pack';

export default testSuite(({ describe }, nodePath: string) => {
	describe('publish mode', async ({ test }) => {
		await using fixture = await createFixture('./tests/fixtures/');

		// Prepare tarball to install
		const packageFilesPath = fixture.getPath('package-files');
		const statOriginalFile = await fs.stat(fixture.getPath('package-files/package.json'));
		const tarballPath = await npmPack(packageFilesPath);
		const entryPackagePath = fixture.getPath('package-entry');

		await test('links', async () => {
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

		await test('watch mode', async () => {
			const watchMode = link([
				'publish',
				'--watch',
				packageFilesPath,
			], {
				cwd: entryPackagePath,
				nodePath,
			});

			// Wait for initial hardlink
			await streamWaitFor(watchMode.stdout!, '✔');

			// Should trigger watch because lib is in files
			fixture.writeFile('package-files/lib/file-a.js', 'file-a');
			await streamWaitFor(watchMode.stdout!, 'lib/file-a.js');

			// Should not trigger watch because it's not in lib
			await fixture.writeFile('package-files/file-b.js', 'file-b');

			await expect(() => streamWaitFor(watchMode.stdout!, 'file-b.js', 1000)).rejects.toThrow('Timeout');
			watchMode.kill();

			await watchMode;
		}, {
			timeout: 5000,
		});
	});
});
