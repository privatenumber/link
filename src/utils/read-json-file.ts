import fs from 'fs';

export async function readJsonFile<JSON = any>(
	filePath: string,
): Promise<JSON> {
	const jsonString = await fs.promises.readFile(filePath, 'utf8');
	return JSON.parse(jsonString);
}
