import path from 'path';
import type { LinkConfig } from '../types';
import { fsExists } from './fs-exists';
import { readJsonFile } from './read-json-file';

const configFileName = 'link.config.json';
const configFileJsName = 'link.config.js';

async function requireConfigAsync(packageDirectory: string): Promise<JSON> {
	// eslint-disable-next-line @typescript-eslint/no-var-requires, node/global-require
	return JSON.parse(JSON.stringify(require(packageDirectory)));
}

const getConfigPath = (
	configDirectory: string,
	file: string,
): string => path.join(configDirectory, file);

export async function loadConfig(
	packageDirectory: string,
) {
	const [configFile, configJsFile] = [configFileName, configFileJsName]
		.map(name => getConfigPath(packageDirectory, name));

	try {
		if (await fsExists(configFile)) {
			return readJsonFile<LinkConfig>(configFile);
		}

		if (await fsExists(configJsFile)) {
			return requireConfigAsync(configJsFile);
		}

		return null;
	} catch (error) {
		throw new Error(`Failed to parse config JSON: ${(error as any).message}`);
	}
}
