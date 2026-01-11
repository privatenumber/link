import path from 'path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { fsExists } from '../../src/utils/fs-exists.js';
import { readJsonFile } from '../../src/utils/read-json-file.js';
import { cwdPath } from '../../src/utils/cwd-path.js';
import { readPackageJson } from '../../src/utils/read-package-json.js';

export default testSuite(({ describe }, _nodePath: string) => {
	describe('utilities', ({ describe }) => {
		describe('fsExists', ({ test }) => {
			test('returns true for existing file', async () => {
				await using fixture = await createFixture({
					'file.txt': 'content',
				});

				const exists = await fsExists(path.join(fixture.path, 'file.txt'));
				expect(exists).toBe(true);
			});

			test('returns false for non-existing file', async () => {
				await using fixture = await createFixture({});

				const exists = await fsExists(path.join(fixture.path, 'non-existent.txt'));
				expect(exists).toBe(false);
			});

			test('returns true for existing directory', async () => {
				await using fixture = await createFixture({
					dir: {},
				});

				const exists = await fsExists(path.join(fixture.path, 'dir'));
				expect(exists).toBe(true);
			});
		});

		describe('readJsonFile', ({ test }) => {
			test('parses valid JSON', async () => {
				await using fixture = await createFixture({
					'data.json': JSON.stringify({
						key: 'value',
						number: 42,
					}),
				});

				const result = await readJsonFile(path.join(fixture.path, 'data.json'));
				expect(result).toEqual({
					key: 'value',
					number: 42,
				});
			});

			test('throws on invalid JSON', async () => {
				await using fixture = await createFixture({
					'invalid.json': '{ invalid json }',
				});

				await expect(
					readJsonFile(path.join(fixture.path, 'invalid.json')),
				).rejects.toThrow();
			});

			test('throws on non-existent file', async () => {
				await using fixture = await createFixture({});

				await expect(
					readJsonFile(path.join(fixture.path, 'missing.json')),
				).rejects.toThrow('ENOENT');
			});
		});

		describe('cwdPath', ({ test }) => {
			test('converts absolute path to relative', () => {
				const cwd = process.cwd();
				const absolutePath = path.join(cwd, 'some', 'nested', 'file.txt');

				const relativePath = cwdPath(absolutePath);
				expect(relativePath).toBe(path.join('some', 'nested', 'file.txt'));
			});

			test('handles path outside cwd', () => {
				const outsidePath = '/some/other/path/file.txt';

				const relativePath = cwdPath(outsidePath);
				// Should return a relative path that goes up directories
				expect(relativePath).toMatch(/\.\./);
			});
		});

		describe('readPackageJson', ({ test }) => {
			test('reads valid package.json', async () => {
				await using fixture = await createFixture({
					'package.json': JSON.stringify({
						name: 'test-package',
						version: '1.0.0',
					}),
				});

				const packageJson = await readPackageJson(fixture.path);
				expect(packageJson.name).toBe('test-package');
				expect(packageJson.version).toBe('1.0.0');
			});

			test('throws when package.json is missing', async () => {
				await using fixture = await createFixture({});

				await expect(
					readPackageJson(fixture.path),
				).rejects.toThrow('package.json not found');
			});

			test('throws when name field is missing', async () => {
				await using fixture = await createFixture({
					'package.json': JSON.stringify({
						version: '1.0.0',
					}),
				});

				await expect(
					readPackageJson(fixture.path),
				).rejects.toThrow('package.json must contain a name');
			});

			test('throws on invalid JSON', async () => {
				await using fixture = await createFixture({
					'package.json': '{ not valid json }',
				});

				await expect(
					readPackageJson(fixture.path),
				).rejects.toThrow();
			});
		});
	});
});
