import path from 'path';
import fs from 'fs/promises';
import { command } from 'cleye';
import packlist from 'npm-packlist';
import outdent from 'outdent';
import {
	green, magenta, cyan, bold, dim, italic,
} from 'kolorist';
import { readPackageJson } from '../utils/read-package-json';
import { hardlink } from '../utils/symlink';

const linkPackage = async (
	basePackagePath: string,
	linkPackagePath: string,
) => {
	const absoluteLinkPackagePath = path.resolve(basePackagePath, linkPackagePath);
	const packageJson = await readPackageJson(absoluteLinkPackagePath);
	const linkPathRelative = `./${path.join('node_modules', packageJson.name)}`;
	const linkPath = path.join(basePackagePath, linkPathRelative);
	const linkPathStat = await fs.lstat(linkPath).catch(() => null);

	// isDirectory() here returns false even if the path is a symlink directory
	if (!linkPathStat?.isDirectory()) {
		console.log(
			outdent`
			Package not setup!

			${bold('Instructions')}
			1. Create a tarball in the target package directory:
			  ${dim('$ npm pack')}

			  ${italic('Tip:')}
			  ${italic('If the project has a build step, add the build command to the `prepack` hook in package.json')}

			2. Install the target package tarball in the current package:
			  ${dim('$ npm install --no-save <tarball path>')}

			3. Run this command again

			Learn more: https://npmjs.com/link
			`,
		);
		return;
	}

	const files = await packlist({
		path: absoluteLinkPackagePath,
		package: packageJson,
		// @ts-expect-error outdated types
		edgesOut: new Map(),
	});

	console.log(`Symlinking ${magenta(packageJson.name)}:`);
	await Promise.all(
		files.map(async (file) => {
			const sourcePath = path.join(absoluteLinkPackagePath, file);
			const targetPath = path.join(linkPath, file);

			await fs.mkdir(
				path.dirname(targetPath),
				{ recursive: true },
			);

			await hardlink(sourcePath, targetPath);
			console.log(`  ${green('✔')}`, cyan(path.relative(basePackagePath, targetPath)), '→', cyan(path.relative(basePackagePath, sourcePath)));
		}),
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
	const cwdProjectPath = process.cwd();
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
