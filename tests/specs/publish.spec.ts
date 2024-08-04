import fs from 'fs/promises';
import path from 'path';
import { testSuite, expect } from 'manten';
import { execa } from 'execa';
import { createFixture } from 'fs-fixture';
import { link } from '../utils/link.js';

export default testSuite(({ describe }, nodePath: string) => {
	describe('publish mode', ({ test }) => {
		test('links', async ({ onTestFinish }) => {
			await using fixture = await createFixture('./tests/fixtures/');
			onTestFinish(async () => await fixture.rm());

			const packageFiles = path.join(fixture.path, 'package-files');
			const statOriginalFile = await fs.stat(path.join(packageFiles, 'package.json'));

			const pack = await execa('npm', ['pack'], {
				cwd: packageFiles,
			});
			const tarballPath = path.join(packageFiles, pack.stdout);

			const entryPackagePath = path.join(fixture.path, 'package-entry');
			await execa('npm', [
				'install',
				'--no-save',
				tarballPath,
			], {
				cwd: entryPackagePath,
			});

			const statBeforeLink = await fs.stat(path.join(entryPackagePath, 'node_modules/package-files/package.json'));

			const linked = await link([
				'publish',
				packageFiles,
			], {
				cwd: entryPackagePath,
				nodePath,
			});
			expect(linked.exitCode).toBe(0);

			const statAfterLink = await fs.stat(path.join(entryPackagePath, 'node_modules/package-files/package.json'));
			expect(statBeforeLink.ino).not.toBe(statAfterLink.ino);

			// Assert hardlink
			expect(statAfterLink.ino).toBe(statOriginalFile.ino);
		});
	});
});
