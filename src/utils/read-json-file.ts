import fs from 'fs';

export const readJsonFile = async (
	filePath: string,
) => {
	const jsonString = await fs.promises.readFile(filePath, 'utf8');
	return JSON.parse(jsonString) as unknown;
};
