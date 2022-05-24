import path from 'path';
import type { LinkConfig } from '../types';
import { fsExists } from './fs-exists';
import { readJsonFile } from './read-json-file';

const configJsonFile = 'link.config.json';
const configJsFile = 'link.config.js';

export async function loadConfig(
	packageDirectory: string,
) {
	const configJsonPath = path.join(packageDirectory, configJsonFile);
	if (await fsExists(configJsonPath)) {
		try {
			return readJsonFile<LinkConfig>(configJsonPath);
		} catch (error) {
			throw new Error(`Failed to parse config JSON ${configJsonPath}: ${(error as any).message}`);
		}
	}

	const configJsPath = path.join(packageDirectory, configJsFile);
	if (await fsExists(configJsPath)) {
		try {
			// eslint-disable-next-line node/global-require,@typescript-eslint/no-var-requires
			return require(configJsPath) as LinkConfig;
		} catch (error) {
			throw new Error(`Failed to load config file ${configJsFile}: ${(error as any).message}`);
		}
	}
}
