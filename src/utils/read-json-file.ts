import fs from 'fs';

export const readJsonFile = async <JSON = any>(
	filePath: string,
): Promise<JSON> => {
	const jsonString = await fs.promises.readFile(filePath, 'utf8');
	return JSON.parse(jsonString);
};
