import path from 'node:path';
import fs from 'node:fs/promises';
import { green, magenta, cyan } from 'kolorist';
import type { PackageJsonWithName } from '../../utils/read-package-json';
import { hardlink } from '../../utils/symlink';
import { getNpmPacklist } from '../../utils/get-npm-packlist';
import { cwdPath } from '../../utils/cwd-path.js';

export const hardlinkPackage = async (
	linkPath: string,
	absoluteLinkPackagePath: string,
	packageJson: PackageJsonWithName,
	publishFilesPromise: string[] | Promise<string[]> = getNpmPacklist(
		absoluteLinkPackagePath,
		packageJson,
	),
) => {
	const [oldPublishFiles, publishFiles] = await Promise.all([
		getNpmPacklist(
			linkPath,

			/**
			 * This is evaluated in the context of the new package.json since that
			 * defines which files belong to the package.
			 */
			packageJson,
		),
		publishFilesPromise,
	]);

	console.log(`Linking ${magenta(packageJson.name)} in publish mode:`);
	await Promise.all(
		publishFiles.map(async (file) => {
			const sourcePath = path.join(absoluteLinkPackagePath, file);
			const targetPath = path.join(linkPath, file);

			await fs.mkdir(
				path.dirname(targetPath),
				{ recursive: true },
			);

			await hardlink(sourcePath, targetPath);

			const fileIndex = oldPublishFiles.indexOf(file);
			if (fileIndex > -1) {
				oldPublishFiles.splice(fileIndex, 1);
			}

			console.log(
				`  ${green('✔')}`,
				cyan(cwdPath(targetPath)),
				'→',
				cyan(cwdPath(sourcePath)),
			);
		}),
	);

	await Promise.all(
		oldPublishFiles.map(async (file) => {
			const cleanPath = path.join(linkPath, file);
			await fs.rm(cleanPath);
		}),
	);
};
