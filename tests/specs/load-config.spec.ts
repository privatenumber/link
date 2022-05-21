import path from 'path';
import { testSuite, expect } from 'manten';
import { loadConfig } from '../../src/utils/load-config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jsFileImports = require('./support/js/link.config.js');

const support = path.dirname(require.resolve('./support/js/link.config.js'));
const configData = {
	packages: [
		'/path/to/package-path-a',
		'../package-path-b',
	],
};

const expectedJSON = JSON.stringify(configData);

const getSupportDirectory = (directory):string => path.normalize(`${support}/../${directory}/`);

export default testSuite(({ describe }) => {
	describe('loading config files', ({ test }) => {
		test('can read link.config.json', async () => {
			const config = await loadConfig(getSupportDirectory('json'));
			expect(config).not.toEqual(null);
			expect(config).toEqual(JSON.parse(expectedJSON));
		});

		test('can read link.config.js files', async () => {
			const config = await loadConfig(getSupportDirectory('js'));
			expect(config).toEqual(jsFileImports);
		});

		test('json files take precedence over js', async () => {
			const config = await loadConfig(getSupportDirectory('both'));
			expect(config).not.toEqual(jsFileImports);
			expect(config).toEqual(JSON.parse(expectedJSON));
		});
	});
});
