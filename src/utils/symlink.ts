import fs from 'fs/promises';

/**
 * Helper to create a symlink
 * Deletes the target path if it exists
 */
export const symlink = async (
	targetPath: string,
	symlinkPath: string,
	type?: string,
) => {
	// Check if valid symlink with a path that resolves
	// const targetPathResolvable = await fsExists(
	// 	path.resolve(path.dirname(symlinkPath), targetPath),
	// );
	// if (!targetPathResolvable) {
	// 	throw new Error('Target path is not resolvable: ' + targetPath);
	// }

	const stats = await fs.lstat(symlinkPath).catch(() => null);

	if (stats) {
		if (stats.isSymbolicLink()) {
			const symlinkRealpath = await fs.realpath(symlinkPath).catch(() => null);

			if (targetPath === symlinkRealpath) {
				return;
			}
		}

		await fs.rm(symlinkPath, {
			recursive: true,
		});
	}

	await fs.symlink(
		targetPath,
		symlinkPath,
		type,
	);
};

export const symlinkBinary = async (
	binaryPath: string,
	linkPath: string,
) => {
	await symlink(
		binaryPath,
		linkPath,
	);

	await fs.chmod(linkPath, 0o755);
};
