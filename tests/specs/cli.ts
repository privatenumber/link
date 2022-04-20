import fs from 'fs';
import path from 'path';
import { testSuite, expect } from 'manten';
import { execa, execaNode } from 'execa';
import { createFixture } from '../utils/create-fixture';
import { link } from '../utils/link';

export default testSuite(({ describe }, nodePath: string) => {
	describe('cli', ({ test, describe }) => {
		// describe('error-cases', () => {
		// 	test('link package doesnt exist', async () => {
		// 		const fixture = await createFixture('./tests/fixtures/');

		// 		const linkProcess = await link(['../non-existing'], {
		// 			cwd: path.join(fixture.path, 'package-entry'),
		// 			nodePath,
		// 		});

		// 		expect(linkProcess.exitCode).toBe(1);
		// 		expect(linkProcess.stderr).toBe('✖ Package path does not exist: ../non-existing');

		// 		await fixture.rm();
		// 	});

		// 	test('link package.json doesnt exist', async () => {
		// 		const fixture = await createFixture('./tests/fixtures/');

		// 		await fixture.rm('package-files/package.json');

		// 		const linkProcess = await link(['../package-files'], {
		// 			cwd: path.join(fixture.path, 'package-entry'),
		// 			nodePath,
		// 		});

		// 		expect(linkProcess.exitCode).toBe(1);
		// 		expect(linkProcess.stderr).toBe('✖ Failed to symlink ../package-files with error: package.json not found in ../package-files');

		// 		await fixture.rm();
		// 	});

		// 	test('single failure should exit 1', async () => {
		// 		const fixture = await createFixture('./tests/fixtures/');

		// 		await fixture.rm('package-files/package.json');

		// 		const linkProcess = await link([
		// 			'../package-binary',
		// 			path.join(fixture.path, 'package-files'),
		// 			'../package-organization',
		// 		], {
		// 			cwd: path.join(fixture.path, 'package-entry'),
		// 			nodePath,
		// 		});

		// 		expect(linkProcess.exitCode).toBe(1);
		// 		expect(linkProcess.stdout).toMatch('✔ Symlinked package-binary: node_modules/package-binary → ../package-binary');
		// 		expect(linkProcess.stdout).toMatch('✔ Symlinked @organization/package-organization: node_modules/@organization/package-organization → ../package-organization');
		// 		expect(linkProcess.stderr).toMatch('✖ Failed to symlink');

		// 		await fixture.rm();
		// 	});
		// });

		// test('consecutive links', async () => {
		// 	const fixture = await createFixture('./tests/fixtures/');

		// 	const entryPackagePath = path.join(fixture.path, 'package-entry');

		// 	// Links multiple packages consecutively
		// 	await link(['../package-binary'], {
		// 		cwd: entryPackagePath,
		// 		nodePath,
		// 	});

		// 	await link([path.join(fixture.path, 'package-files')], {
		// 		cwd: entryPackagePath,
		// 		nodePath,
		// 	});

		// 	await link(['../package-organization'], {
		// 		cwd: entryPackagePath,
		// 		nodePath,
		// 	});

		// 	// Test that linked packages are resolvable
		// 	const packageA = await execaNode(
		// 		entryPackagePath,
		// 		[],
		// 		{
		// 			nodePath,
		// 			nodeOptions: [],
		// 		},
		// 	);
		// 	expect(packageA.stdout).toBe('["package-entry","package-binary","package-files","@organization/package-organization"]');

		// 	// Test binary
		// 	await fixture.writeJson('package-entry/package.json', {
		// 		scripts: {
		// 			test: 'binary',
		// 		},
		// 	});

		// 	const binary = await execa('npm', ['test'], {
		// 		cwd: entryPackagePath,
		// 	});
		// 	expect(binary.stdout).toMatch('package-binary');

		// 	// Expect non publish files to exist in symlink
		// 	const nonPublishFileExists = await fixture.exists('package-entry/node_modules/package-files/non-publish-file.js');
		// 	expect(nonPublishFileExists).toBe(true);

		// 	await fixture.rm();
		// });

		// test('multiple packages', async () => {
		// 	const fixture = await createFixture('./tests/fixtures/');

		// 	const entryPackagePath = path.join(fixture.path, 'package-entry');

		// 	await link([
		// 		'../package-binary',
		// 		path.join(fixture.path, 'package-files'),
		// 		'../package-organization',
		// 	], {
		// 		cwd: entryPackagePath,
		// 		nodePath,
		// 	});

		// 	// Test that linked packages are resolvable
		// 	const packageA = await execaNode(
		// 		entryPackagePath,
		// 		[],
		// 		{
		// 			nodePath,
		// 			nodeOptions: [],
		// 		},
		// 	);
		// 	expect(packageA.stdout).toBe('["package-entry","package-binary","package-files","@organization/package-organization"]');

		// 	// Test binary
		// 	await fixture.writeJson('package-entry/package.json', {
		// 		scripts: {
		// 			test: 'binary',
		// 		},
		// 	});

		// 	const binary = await execa('npm', ['test'], {
		// 		cwd: entryPackagePath,
		// 	});
		// 	expect(binary.stdout).toMatch('package-binary');

		// 	// Expect non publish files to exist in symlink
		// 	const nonPublishFileExists = await fixture.exists('package-entry/node_modules/package-files/non-publish-file.js');
		// 	expect(nonPublishFileExists).toBe(true);

		// 	await fixture.rm();
		// });

		test('works without package.json in cwd', async () => {
			const fixture = await createFixture('./tests/fixtures/');

			await fixture.rm('package-entry/package.json');

			const linkA = await link(['../package-binary'], {
				cwd: path.join(fixture.path, 'package-entry'),
				nodePath,
			});

			console.log(linkA);

			const linkB = await link([path.join(fixture.path, 'package-files')], {
				cwd: path.join(fixture.path, 'package-entry'),
				nodePath,
			});

			console.log(linkB);

			const linkC = await link(['../package-organization'], {
				cwd: path.join(fixture.path, 'package-entry'),
				nodePath,
			});

			console.log(linkC);

			console.log(await fs.promises.readdir(
				path.join(fixture.path, 'package-entry/node_modules'),
			));

			console.log(await fs.promises.readdir(
				path.join(fixture.path, 'package-entry/node_modules/package-binary'),
			));

			console.log(await fs.promises.realpath(
				path.join(fixture.path, 'package-entry/node_modules/package-binary'),
			));

			const packageA = await execaNode(
				path.join(fixture.path, 'package-entry'),
				[],
				{
					nodePath,
					nodeOptions: [],
				},
			);
			console.log(packageA);
			// expect(packageA.stdout).toBe('["package-entry","package-binary","package-files","@organization/package-organization"]');

			await fixture.rm();
		});
	});
});
