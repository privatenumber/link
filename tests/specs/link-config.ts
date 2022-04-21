import path from 'path';
import { testSuite, expect } from 'manten';
import { execa, execaNode } from 'execa';
import { createFixture } from '../utils/create-fixture';
import { link } from '../utils/link';

export default testSuite(({ describe }, nodePath: string) => {
	describe('link.config.json', ({ test }) => {
		test('symlink', async () => {
			const fixture = await createFixture('./tests/fixtures/');

			const entryPackagePath = path.join(fixture.path, 'package-entry');

			await fixture.writeJson('package-entry/link.config.json', {
				packages: [
					// Relative path & binary
					'../package-binary',

					// Absolute path
					path.join(fixture.path, 'package-files'),

					// Package with @org in name
					'../package-organization',
				],
			});

			await link([], {
				cwd: entryPackagePath,
				nodePath,
			});

			const packageA = await execaNode(
				path.join(entryPackagePath, 'index.js'),
				[],
				{
					nodePath,
					nodeOptions: [],
				},
			);
			expect(packageA.stdout).toBe('["package-entry","package-binary","package-files","@organization/package-organization"]');

			// Executable via npm
			await fixture.writeJson('package-entry/package.json', {
				scripts: {
					test: 'binary',
				},
			});
			const binaryNpm = await execa('npm', ['test'], {
				cwd: entryPackagePath,
			});
			expect(binaryNpm.stdout).toMatch('package-binary');


			const binary = await execa(path.join(entryPackagePath, 'node_modules/.bin/binary'));
			expect(binary.stdout).toBe('package-binary');

			const nonPublishFileExists = await fixture.exists('package-entry/node_modules/package-files/non-publish-file.js');
			expect(nonPublishFileExists).toBe(true);

			await fixture.rm();
		});

	});
});

