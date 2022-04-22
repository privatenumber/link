import fs from 'fs';
import { fsExists } from './fs-exists';
import { remove } from 'fs-extra/lib/remove';

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

		await remove(symlinkPath);
	}

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
