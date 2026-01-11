import path from 'path';
import fs from 'fs/promises';
import { fsExists } from './fs-exists';

/**
 * Helper to create a symlink
 * Deletes the target path if it exists
 */
export const symlink = async (
	targetPath: string,
	symlinkPath: string,
	type?: string,
) => {
	const stats = await fs.lstat(symlinkPath).catch(() => null);
	if (stats) {
		if (stats.isSymbolicLink()) {
			const currentRealpath = await fs.realpath(symlinkPath).catch(() => null);

			if (currentRealpath) {
				// Resolve targetPath to absolute if relative (relative to symlink's directory)
				const absoluteTargetPath = path.isAbsolute(targetPath)
					? targetPath
					: path.resolve(path.dirname(symlinkPath), targetPath);

				// Get realpath of target for consistent comparison (handles Windows path quirks)
				const targetRealpath = await fs.realpath(absoluteTargetPath).catch(() => null);

				if (targetRealpath) {
					// Compare realpaths (case-insensitive on Windows)
					const isSame = process.platform === 'win32'
						? currentRealpath.toLowerCase() === targetRealpath.toLowerCase()
						: currentRealpath === targetRealpath;
					if (isSame) {
						return;
					}
				}
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
	await symlink(binaryPath, linkPath);

	// chmod follows symlinks and applies to the target, not the symlink
	// If target doesn't exist, warn and continue - linking should still succeed
	await fs.chmod(linkPath, 0o755).catch((error) => {
		if (error.code === 'ENOENT') {
			console.warn(`Warning: Binary target does not exist: ${binaryPath}`);
			console.warn('When built, ensure it has executable permissions (chmod +x)');
			return;
		}
		throw error;
	});
};

export const hardlink = async (
	sourcePath: string,
	hardlinkPath: string,
) => {
	if (await fsExists(hardlinkPath)) {
		const [
			existingStat,
			sourceStat,
		] = await Promise.all([
			fs.stat(hardlinkPath),
			fs.stat(sourcePath),
		]);
		if (existingStat.ino === sourceStat.ino) {
			return;
		}

		await fs.rm(hardlinkPath, {
			recursive: true,
		});
	}

	await fs.link(sourcePath, hardlinkPath);
};
