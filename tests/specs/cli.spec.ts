import fs from 'fs/promises';
import path from 'path';
import { testSuite, expect } from 'manten';
import { execa, execaNode } from 'execa';
import { createFixture } from 'fs-fixture';
import { link } from '../utils';

export default testSuite(({ describe }, nodePath: string) => {
	describe('cli', ({ test, describe }) => {
		describe('error-cases', ({ test }) => {
			test('link package doesnt exist', async () => {
				const fixture = await createFixture('./tests/fixtures/');

				const linkProcess = await link(['../non-existing'], {
					cwd: path.join(fixture.path, 'package-entry'),
					nodePath,
				});

				expect(linkProcess.exitCode).toBe(1);
				expect(linkProcess.stderr).toBe('✖ Package path does not exist: ../non-existing');

				await fixture.rm();
			});

			test('link package.json doesnt exist', async () => {
				const fixture = await createFixture('./tests/fixtures/');

				await fixture.rm('package-files/package.json');

				const linkProcess = await link(['../package-files'], {
					cwd: path.join(fixture.path, 'package-entry'),
					nodePath,
				});

				expect(linkProcess.exitCode).toBe(1);
				expect(linkProcess.stderr).toMatch('✖ Failed to symlink ../package-files with error: package.json not found');

				await fixture.rm();
			});

			test('single failure should exit 1', async () => {
				const fixture = await createFixture('./tests/fixtures/');

				await fixture.rm('package-files/package.json');

				const linkProcess = await link([
					'../package-binary',
					path.join(fixture.path, 'package-files'),
					'../package-scoped',
				], {
					cwd: path.join(fixture.path, 'package-entry'),
					nodePath,
				});

				expect(linkProcess.exitCode).toBe(1);
				expect(linkProcess.stdout).toMatch('✔ Symlinked package-binary');
				expect(linkProcess.stdout).toMatch('✔ Symlinked @scope/package-scoped');
				expect(linkProcess.stderr).toMatch('✖ Failed to symlink');

				await fixture.rm();
			});

			test('symlink exists', async () => {
				const fixture = await createFixture('./tests/fixtures/');
				const packageEntryPath = path.join(fixture.path, 'package-entry');

				await fs.mkdir(path.join(packageEntryPath, 'node_modules'));
				await fs.symlink(
					'../../package-files',
					path.join(packageEntryPath, 'node_modules/package-files'),
				);

				const linkProcess = await link(['../package-files'], {
					cwd: packageEntryPath,
					nodePath,
				});

				expect(linkProcess.exitCode).toBe(0);

				await fixture.rm();
			});

			test('broken symlink exists', async () => {
				const fixture = await createFixture('./tests/fixtures/');
				const packageEntryPath = path.join(fixture.path, 'package-entry');

				await fs.mkdir(path.join(packageEntryPath, 'node_modules'));
				await fs.symlink(
					'../broken-symlink/../../package-files',
					path.join(packageEntryPath, 'node_modules/package-files'),
				);

				const linkProcess = await link(['../package-files'], {
					cwd: path.join(fixture.path, 'package-entry'),
					nodePath,
				});

				expect(linkProcess.exitCode).toBe(0);

				await fixture.rm();
			});

			test('directory in-place of symlink', async () => {
				const fixture = await createFixture('./tests/fixtures/');
				const packageEntryPath = path.join(fixture.path, 'package-entry');

				await fs.mkdir(path.join(packageEntryPath, 'node_modules/package-files'), {
					recursive: true,
				});

				const linkProcess = await link(['../package-files'], {
					cwd: path.join(fixture.path, 'package-entry'),
					nodePath,
				});

				expect(linkProcess.exitCode).toBe(0);

				await fixture.rm();
			});
		});

		test('consecutive links', async () => {
			const fixture = await createFixture('./tests/fixtures/');

			const entryPackagePath = path.join(fixture.path, 'package-entry');

			// Links multiple packages consecutively
			await Promise.all(
				[
					'../package-binary',
					path.join(fixture.path, 'package-files'),
					'../package-scoped',
					'../nested/package-deep-link',
				].map(async (packagePath) => {
					await link([packagePath], {
						cwd: entryPackagePath,
						nodePath,
					});
				}),
			);

			// Test that linked packages are resolvable
			const entryPackage = await execaNode(
				entryPackagePath,
				[],
				{
					nodePath,
					nodeOptions: [],
				},
			);
			expect(entryPackage.stdout).toBe('["package-entry","package-binary","package-files","@scope/package-scoped",["package-deep-link",null,null]]');

			// Test binary
			await fixture.writeJson('package-entry/package.json', {
				scripts: {
					test: 'binary',
				},
			});

			const binary = await execa('npm', ['test'], {
				cwd: entryPackagePath,
			});
			expect(binary.stdout).toMatch('package-binary');
			expect(
				await fixture.exists('package-entry/node_modules/.bin/package-scoped'),
			).toBe(true);

			// Expect non publish files to exist in symlink
			expect(
				await fixture.exists('package-entry/node_modules/package-files/non-publish-file.js'),
			).toBe(true);

			await fixture.rm();
		});

		test('multiple packages', async () => {
			const fixture = await createFixture('./tests/fixtures/');

			const entryPackagePath = path.join(fixture.path, 'package-entry');

			await link([
				'../package-binary',
				path.join(fixture.path, 'package-files'),
				'../package-scoped',
				'../nested/package-deep-link',
			], {
				cwd: entryPackagePath,
				nodePath,
			});

			// Test that linked packages are resolvable
			const entryPackage = await execaNode(
				entryPackagePath,
				[],
				{
					nodePath,
					nodeOptions: [],
				},
			);
			expect(entryPackage.stdout).toBe('["package-entry","package-binary","package-files","@scope/package-scoped",["package-deep-link",null,null]]');

			// Test binary
			const binary = await execa(path.join(entryPackagePath, 'node_modules/.bin/binary'));
			expect(binary.stdout).toMatch('package-binary');
			expect(
				await fixture.exists('package-entry/node_modules/.bin/package-scoped'),
			).toBe(true);

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

			// Expect non publish files to exist in symlink
			const nonPublishFileExists = await fixture.exists('package-entry/node_modules/package-files/non-publish-file.js');
			expect(nonPublishFileExists).toBe(true);

			await fixture.rm();
		});

		test('works without package.json in cwd', async () => {
			const fixture = await createFixture('./tests/fixtures/');
			const entryPackagePath = path.join(fixture.path, 'package-entry');

			await fixture.rm('package-entry/package.json');

			await Promise.all(
				[
					'../package-binary',
					path.join(fixture.path, 'package-files'),
					'../package-scoped',
					'../nested/package-deep-link',
				].map(async (packagePath) => {
					await link([packagePath], {
						cwd: entryPackagePath,
						nodePath,
					});
				}),
			);

			const entryPackage = await execaNode(
				path.join(fixture.path, 'package-entry'),
				[],
				{
					nodePath,
					nodeOptions: [],
				},
			);
			expect(entryPackage.stdout).toBe('["package-entry","package-binary","package-files","@scope/package-scoped",["package-deep-link",null,null]]');

			await fixture.rm();
		});

		test('deep linking', async () => {
			const fixture = await createFixture('./tests/fixtures/');
			const entryPackagePath = path.join(fixture.path, 'package-entry');

			await fixture.rm('package-entry/package.json');

			const linkProcess = await link([
				'../package-binary',
				path.join(fixture.path, 'package-files'),
				'../package-scoped',
				'../nested/package-deep-link',
				'--deep',
			], {
				cwd: entryPackagePath,
				nodePath,
			});

			expect(linkProcess.exitCode).toBe(0);

			const entryPackage = await execaNode(
				entryPackagePath,
				[],
				{
					nodePath,
					nodeOptions: [],
				},
			);
			expect(entryPackage.stdout).toBe('["package-entry","package-binary","package-files","@scope/package-scoped",["package-deep-link","package-files","@scope/package-scoped"]]');

			await fixture.rm();
		});

		test('overwrites directory in place of symlink', async () => {
			const fixture = await createFixture('./tests/fixtures/');
			const entryPackagePath = path.join(fixture.path, 'package-entry');

			await fs.mkdir(
				path.join(entryPackagePath, 'node_modules/package-binary'),
				{ recursive: true },
			);

			const linkBinary = await link(['../package-binary'], {
				cwd: entryPackagePath,
				nodePath,
			});

			expect(linkBinary.exitCode).toBe(0);

			await fixture.rm();
		});
	});
});
