import fs from 'fs/promises';

export const fsExists = (
	path: string,
) => fs.access(path).then(
	() => true,
	() => false,
);
