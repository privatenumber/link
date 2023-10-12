import path from 'path';
import fs from 'fs/promises';
import { command } from 'cleye';
import packlist from 'npm-packlist';
import outdent from 'outdent';
import {
	green, magenta, cyan, bold, dim,
} from 'kolorist';
import { readPackageJson } from '../utils/read-package-json';
import { hardlink } from '../utils/symlink';

const linkPackage = async (
	basePackagePath: string,
	linkPackagePath: string,
) => {
	const absoluteLinkPackagePath = path.resolve(basePackagePath, linkPackagePath);
	const packageJson = await readPackageJson(absoluteLinkPackagePath);
	const linkPath = path.join(basePackagePath, 'node_modules', packageJson.name);
	const linkPathStat = await fs.stat(linkPath).catch(() => null);

	if (linkPathStat?.isDirectory()) {
		/**
		 * If it's a symlink, make sure it's in the node_modules directory of the base package.
		 * e.g. This could happen with pnpm
		 *
		 * If it's not, it might be a development directory and we don't want to overwrite it.
		 */
		const linkPathReal = await fs.realpath(linkPath);
		const expectedPrefix = path.join(basePackagePath, 'node_modules');

		console.log({
			linkPathReal,
			expectedPrefix,
		});
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

			console.log(`Symlinking ${magenta(packageJson.name)}:`);
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

					console.log(`  ${green('✔')}`, cyan(path.relative(basePackagePath, targetPath)), '→', cyan(path.relative(basePackagePath, sourcePath)));
				}),
			);

			await Promise.all(
				oldPublishFiles.map(async (file) => {
					const cleanPath = path.join(linkPath, file);
					await fs.rm(cleanPath);
					console.log(`  ${green('✔')}`, 'Removed path', cleanPath);
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

export const publish = command({
	name: 'publish',
	parameters: ['[package paths...]'],
	flags: {
		// watch: {
		// 	type: Boolean,
		// 	alias: 'w',
		// 	description: 'Watch for changes in the package and automatically relink',
		// },
	},
	help: {
		description: 'Link a package to simulate an environment similar to `npm install`',
	},
}, async (argv) => {
	const cwdProjectPath = await fs.realpath(process.cwd());
	const { packagePaths } = argv._;

	if (packagePaths.length > 0) {
		await Promise.all(
			packagePaths.map(
				linkPackagePath => linkPackage(
					cwdProjectPath,
					linkPackagePath,
				),
			),
		);
	}
});
