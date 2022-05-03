import fs from 'fs';
import { remove } from 'fs-extra/lib/remove/index.js';

export async function symlink(
	targetPath: string,
	symlinkPath: string,
	type?: string,
) {
	console.log(1);
	const stats = await fs.promises.lstat(symlinkPath).catch(() => null);
	if (stats) {
		console.log(2, stats.isSymbolicLink());

		if (stats.isSymbolicLink()) {
			console.log(22);
			const symlinkRealpath = await fs.promises.realpath(symlinkPath).catch(() => null);

			if (targetPath === symlinkRealpath) {
				console.log(4);
				return;
			}
		}

		if (stats.isDirectory()) {
			console.log(5);
			await remove(symlinkPath);
		} else {
			console.log(55);
			await fs.promises.unlink(symlinkPath);
		}
		console.log(555);
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
