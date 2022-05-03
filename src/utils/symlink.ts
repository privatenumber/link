import fs from 'fs';
import { remove } from 'fs-extra/lib/remove/index.js';
import { fsExists } from './fs-exists';

export async function symlink(
	targetPath: string,
	symlinkPath: string,
	type?: string,
) {
	console.log(1);
	if (await fsExists(symlinkPath)) {
		console.log(2);
		const symlinkRealpath = await fs.promises.realpath(symlinkPath).catch(() => null);
		console.log(3);

		if (targetPath === symlinkRealpath) {
			console.log(4);
			return;
		}

		console.log(5);
		await remove(symlinkPath);
	}

	console.log(6);
	await fs.promises.symlink(
		targetPath,
		symlinkPath,
		type,
	);
}

export async function symlinkBinary(
	binaryPath: string,
	linkPath: string,
) {
	await symlink(
		binaryPath,
		linkPath,
	);

	await fs.promises.chmod(linkPath, 0o755);
}
