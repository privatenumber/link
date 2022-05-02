import fs from 'fs';

// Checks if symlink file exists
export const fsExists = (
	path: string,
) => fs.promises.lstat(path).then(
	() => true,
	() => false,
);
