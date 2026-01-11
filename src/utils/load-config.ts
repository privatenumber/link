import path from 'path';
import { createRequire } from 'module';
import type { LinkConfig } from '../types.js';
import { fsExists } from './fs-exists.js';
import { readJsonFile } from './read-json-file.js';

const configJsonFile = 'link.config.json';
const configJsFile = 'link.config.js';

export const loadConfig = async (
	packageDirectory: string,
) => {
	const configJsonPath = path.join(packageDirectory, configJsonFile);
	if (await fsExists(configJsonPath)) {
		try {
			return await readJsonFile(configJsonPath) as LinkConfig;
		} catch (error) {
			throw new Error(`Failed to parse config JSON ${configJsonPath}: ${(error as Error).message}`);
		}
	}

	const configJsPath = path.join(packageDirectory, configJsFile);
	if (await fsExists(configJsPath)) {
		try {
			const require = createRequire(import.meta.url);
			// eslint-disable-next-line import-x/no-dynamic-require
			return require(configJsPath) as LinkConfig;
		} catch (error) {
			throw new Error(`Failed to load config file ${configJsFile}: ${(error as Error).message}`);
		}
	}
};
