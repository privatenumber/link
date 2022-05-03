import fs from 'fs';
import { remove } from 'fs-extra/lib/remove/index.js';

export async function symlink(
	targetPath: string,
	symlinkPath: string,
	type?: string,
) {
	const stats = await fs.promises.lstat(symlinkPath).catch(() => null);

	if (stats) {
		if (stats.isSymbolicLink()) {
			const symlinkRealpath = await fs.promises.realpath(symlinkPath).catch(() => null);

			if (targetPath === symlinkRealpath) {
				return;
			}
		}

		if (stats.isDirectory()) {
			await remove(symlinkPath);
		} else {
			await fs.promises.unlink(symlinkPath);
		}
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
