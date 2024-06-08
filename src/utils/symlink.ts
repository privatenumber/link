import { watch } from 'fs';
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
	await symlink(binaryPath, linkPath);
	await fs.chmod(linkPath, 0o755);
};

export const hardlink = async (
	sourcePath: string,
	hardlinkPath: string,
) => {
	if (await fsExists(hardlinkPath)) {
		await fs.rm(hardlinkPath, {
			recursive: true,
		});
	}

	await fs.link(sourcePath, hardlinkPath);
};

export const hardlinkAndWatch = async (
	sourcePath: string,
	hardlinkPath: string,
) => {
	// Initially create the hard link
	await hardlink(sourcePath, hardlinkPath);

	// Setup a watcher for the source file
	watch(sourcePath, {persistent: true}, async (eventType) => {
		if (eventType === 'rename') {
			const interval = setInterval(async () => {
				const sourceFileExists = await fsExists(sourcePath);
				if (!sourceFileExists) {
					return;
				}
				await hardlink(sourcePath, hardlinkPath);
				clearInterval(interval);
			}, 50);
		}
	});
};
