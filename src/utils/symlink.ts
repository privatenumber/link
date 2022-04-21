import fs from 'fs';
import del from 'del';
import { fsExists } from './fs-exists';

export async function symlink(
	targetPath: string,
	symlinkPath: string,
	type?: string,
) {
	if (await fsExists(symlinkPath)) {
		const symlinkRealpath = await fs.promises.realpath(symlinkPath);

		if (targetPath === symlinkRealpath) {
			return;
		}

		// TODO: Change to rm
		await del(symlinkPath);
	}

	await fs.promises.symlink(
		targetPath,
		symlinkPath,
		type,
	);
}
