import fs from 'node:fs/promises';
import path from 'node:path';
import { testSuite, expect } from 'manten';
import { execa } from 'execa';
import { createFixture } from 'fs-fixture';
import { link } from '../utils/link.js';
import { npmPack } from '../utils/npm-pack.js';

export default testSuite(({ describe }, nodePath: string) => {
	describe('publish mode', ({ test }) => {
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
	});
});
