import path from 'path';
import type { LinkConfig } from '../types';
import { fsExists } from './fs-exists';
import { readJsonFile } from './read-json-file';

const configFile = 'link.config.json';

export async function loadConfig(
	packageDirectory: string,
) {
	const configPath = path.join(packageDirectory, configFile);
	const configExists = await fsExists(configPath);

	if (!configExists) {
		return null;
	}

	try {
		return readJsonFile<LinkConfig>(configPath);
	} catch (error) {
		throw new Error(`Failed to parse config JSON: ${(error as any).message}`);
	}
}
