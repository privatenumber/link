import path from 'node:path';

const cwd = process.cwd();

export const cwdPath = (
	filePath: string,
) => path.relative(cwd, filePath);
