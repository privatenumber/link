import path from 'path';
import type { LinkConfig } from '../types';
import { fsExists } from './fs-exists';
import { readJsonFile } from './read-json-file';

const configJsonFile = 'link.config.json';
const configJsFile = 'link.config.js';

export const loadConfig = async (
	packageDirectory: string,
) => {
	const configJsonPath = path.join(packageDirectory, configJsonFile);
	if (await fsExists(configJsonPath)) {
		try {
			return readJsonFile(configJsonPath) as LinkConfig;
		} catch (error) {
			throw new Error(`Failed to parse config JSON ${configJsonPath}: ${(error as Error).message}`);
		}
	}

	const configJsPath = path.join(packageDirectory, configJsFile);
	if (await fsExists(configJsPath)) {
		try {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			return require(configJsPath) as LinkConfig;
		} catch (error) {
			throw new Error(`Failed to load config file ${configJsFile}: ${(error as Error).message}`);
		}
	}
};
