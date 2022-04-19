import { fsExists } from './fs-exists';
import { readJsonFile } from './read-json-file';
import type { LinkConfig } from '../types';

const configPath = 'link.config.json';

export async function loadConfig() {
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
