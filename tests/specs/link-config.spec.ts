import path from 'path';
import { testSuite, expect } from 'manten';
import { execa, execaNode } from 'execa';
import { createFixture } from 'fs-fixture';
import { link } from '../utils/link.js';

export default testSuite(({ describe }, nodePath: string) => {
	describe('link.config.json', ({ test, describe }) => {
		test('shows warning when no config file exists', async () => {
			await using fixture = await createFixture({
				'package-entry': {
					'package.json': JSON.stringify({ name: 'package-entry' }),
				},
			});

			const entryPackagePath = path.join(fixture.path, 'package-entry');

			const result = await link([], {
				cwd: entryPackagePath,
				nodePath,
			});

			expect(result.stderr).toMatch('Warning: Config file "link.config.json" not found');
		});

		test('fails with parse error for invalid JSON', async () => {
			await using fixture = await createFixture({
				'package-entry': {
					'package.json': JSON.stringify({ name: 'package-entry' }),
					'link.config.json': '{ invalid json }',
				},
			});

			const entryPackagePath = path.join(fixture.path, 'package-entry');

			const result = await link([], {
				cwd: entryPackagePath,
				nodePath,
			});

			expect(result.exitCode).toBe(1);
			// JSON parse error surfaces to CLI
			expect(result.stderr).toMatch('JSON');
		});

		test('handles empty packages array', async () => {
			await using fixture = await createFixture({
				'package-entry': {
					'package.json': JSON.stringify({ name: 'package-entry' }),
					'link.config.json': JSON.stringify({ packages: [] }),
				},
			});

			const entryPackagePath = path.join(fixture.path, 'package-entry');

			const result = await link([], {
				cwd: entryPackagePath,
				nodePath,
			});

			// Should succeed with no packages to link
			expect(result.exitCode).toBe(0);
		});

		test('symlink', async () => {
			await using fixture = await createFixture('./tests/fixtures/');
			const entryPackagePath = path.join(fixture.path, 'package-entry');

			await fixture.writeJson('package-entry/link.config.json', {
				packages: [
					// Relative path & binary
					'../package-binary',

					// Absolute path
					path.join(fixture.path, 'package-files'),

					// Package with @org in name
					'../package-scoped',

					'../nested/package-deep-link',
				],
			});

			await link([], {
				cwd: entryPackagePath,
				nodePath,
			});

			const entryPackage = await execaNode(
				path.join(entryPackagePath, 'index.js'),
				[],
				{
					nodePath,
					nodeOptions: [],
				},
			);
			expect(entryPackage.stdout).toBe('["package-entry","package-binary","package-files","@scope/package-scoped",["package-deep-link",null,null]]');

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
		});

		describe('deep linking', ({ test }) => {
			test('cli', async () => {
				await using fixture = await createFixture('./tests/fixtures/');
				const entryPackagePath = path.join(fixture.path, 'package-entry');

				await fixture.writeJson('package-entry/link.config.json', {
					packages: [
						// Relative path & binary
						'../package-binary',

						// Absolute path
						path.join(fixture.path, 'package-files'),

						// Package with @org in name
						'../package-scoped',

						'../nested/package-deep-link',
					],
				});

				await link(['--deep'], {
					cwd: entryPackagePath,
					nodePath,
				});

				const entryPackage = await execaNode(
					path.join(entryPackagePath, 'index.js'),
					[],
					{
						nodePath,
						nodeOptions: [],
					},
				);
				expect(entryPackage.stdout).toBe('["package-entry","package-binary","package-files","@scope/package-scoped",["package-deep-link","package-files","@scope/package-scoped"]]');
			});

			test('link.config', async () => {
				await using fixture = await createFixture('./tests/fixtures/');
				const entryPackagePath = path.join(fixture.path, 'package-entry');

				await fixture.writeJson('package-entry/link.config.json', {
					deepLink: true,

					packages: [
						// Relative path & binary
						'../package-binary',

						// Absolute path
						path.join(fixture.path, 'package-files'),

						// Package with @org in name
						'../package-scoped',

						'../nested/package-deep-link',
					],
				});

				await link([], {
					cwd: entryPackagePath,
					nodePath,
				});

				const entryPackage = await execaNode(
					path.join(entryPackagePath, 'index.js'),
					[],
					{
						nodePath,
						nodeOptions: [],
					},
				);
				expect(entryPackage.stdout).toBe('["package-entry","package-binary","package-files","@scope/package-scoped",["package-deep-link","package-files","@scope/package-scoped"]]');
			});
		});
	});

	describe('link.config.js', ({ test }) => {
		test('catches invalid config error', async () => {
			await using fixture = await createFixture('./tests/fixtures/');
			const entryPackagePath = path.join(fixture.path, 'package-entry');

			await fixture.writeFile(
				'package-entry/link.config.js',
				'module.export.throws.error = {}',
			);

			const linkProcess = await link([], {
				cwd: entryPackagePath,
				nodePath,
			});

			expect(linkProcess.stderr).toMatch('Error: Failed to load config file link.config.js:');
		});

		test('symlink', async () => {
			await using fixture = await createFixture('./tests/fixtures/');
			const entryPackagePath = path.join(fixture.path, 'package-entry');

			await fixture.writeFile(
				'package-entry/link.config.js',
				`module.exports = ${JSON.stringify({
					packages: [
						// Relative path & binary
						'../package-binary',

						// Absolute path
						path.join(fixture.path, 'package-files'),

						// Package with @org in name
						'../package-scoped',

						'../nested/package-deep-link',
					],
				})}`,
			);

			await link([], {
				cwd: entryPackagePath,
				nodePath,
			});

			const entryPackage = await execaNode(
				path.join(entryPackagePath, 'index.js'),
				[],
				{
					nodePath,
					nodeOptions: [],
				},
			);
			expect(entryPackage.stdout).toBe('["package-entry","package-binary","package-files","@scope/package-scoped",["package-deep-link",null,null]]');

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
		});
	});
});
