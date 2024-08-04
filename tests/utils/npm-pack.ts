import path from 'node:path';
import { execa } from 'execa';

export const npmPack = async (packageDirectory: string) => {
	const pack = await execa('npm', ['pack'], {
		cwd: packageDirectory,
	});
	return path.join(packageDirectory, pack.stdout);
};
