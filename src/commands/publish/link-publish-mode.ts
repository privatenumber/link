import path from 'path';
import fs from 'fs/promises';
import packlist from 'npm-packlist';
import outdent from 'outdent';
import {
	green, magenta, cyan, bold, dim,
} from 'kolorist';
import { readPackageJson } from '../../utils/read-package-json.js';
import { hardlink } from '../../utils/symlink.js';
import { cwdPath } from '../../utils/cwd-path.js';

export const linkPublishMode = async (
	basePackagePath: string,
	linkPackagePath: string,
) => {
	const absoluteLinkPackagePath = path.resolve(basePackagePath, linkPackagePath);
	const packageJson = await readPackageJson(absoluteLinkPackagePath);
	const expectedPrefix = path.join(basePackagePath, 'node_modules/');
	const linkPath = path.join(expectedPrefix, packageJson.name);
	const linkPathStat = await fs.stat(linkPath).catch(() => null);

	if (linkPathStat?.isDirectory()) {
		/**
		 * If it's a symlink, make sure it's in the node_modules directory of the base package.
		 * e.g. This could happen with pnpm
		 *
		 * If it's not, it might be a development directory and we don't want to overwrite it.
		 */
		const linkPathReal = await fs.realpath(linkPath);
		if (linkPathReal.startsWith(expectedPrefix)) {
			const edgesOut = new Map();
			const [oldPublishFiles, publishFiles] = await Promise.all([
				packlist({
					path: linkPathReal,

					/**
					 * This is evaluated in the context of the new package.json since that
					 * defines which files belong to the package.
					 */
					package: packageJson,
					// @ts-expect-error outdated types
					edgesOut,
				}),
				packlist({
					path: absoluteLinkPackagePath,
					package: packageJson,
					// @ts-expect-error outdated types
					edgesOut,
				}),
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
			return;
		}
	}

	console.error(
		outdent`
		Error: Package ${magenta(packageJson.name)} is not set up

		${bold('Setup instructions')}
		1. In the Dependency package, create a tarball:
		  ${dim('$ npm pack')}

		2. In the Consuming package, install the tarball and link the Dependency:
		  ${dim('$ npm install --no-save <dependency-tarball>')}
		  ${dim('$ npx link publish <dependency-path>')}

		3. Start developing!

		Learn more: https://npmjs.com/link
		`,
	);
};
