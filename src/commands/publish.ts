import path from 'path';
import fs from 'fs/promises';
import { command } from 'cleye';
import packlist from 'npm-packlist';
import outdent from 'outdent';
import { bold, dim, italic } from 'kolorist';
import { readPackageJson } from '../utils/read-package-json';
import { symlink, hardlink } from '../utils/symlink';

const linkPackage = async (
	basePackagePath: string,
	linkPackagePath: string,
	options?: {
		hard?: boolean;
	},
) => {
	const absoluteLinkPackagePath = path.resolve(basePackagePath, linkPackagePath);
	const packageJson = await readPackageJson(absoluteLinkPackagePath);
	const relativeLinkPath = './' + path.join('node_modules', packageJson.name);
	const linkPath = path.join(basePackagePath, relativeLinkPath);
	const linkPathStat = await fs.lstat(linkPath).catch(() => null);

	// isDirectory() here returns false even if the path is a symlink directory
	if (!linkPathStat?.isDirectory()) {
		console.log(outdent`
		Package not setup!

		${bold('Instructions')}
		1. Create a tarball in the target package directory:
		  ${dim('$ npm pack')}

		  ${italic('Tip: If you have a build step, add the build command to the package.json#prepack hook')}

		2. Install the target package tarball in the current package:
		  ${dim('$ npm install --no-save <tarball path>')}

		Learn more: https://npmjs.com/link
		`);
		return;
	}

	const files = await packlist({
		path: absoluteLinkPackagePath,
		package: packageJson,
		edgesOut: new Map<string, string>(),
	});

	await Promise.all(
		files.map(async (file) => {
			const sourcePath = path.join(absoluteLinkPackagePath, file);
			const targetPath = path.join(linkPath, file);

			await fs.mkdir(
				path.dirname(targetPath),
				{ recursive: true },
			);

			if (options?.hard) {
				await hardlink(sourcePath, targetPath);
			} else {
				await symlink(sourcePath, targetPath);
			}
		}),
	);

	console.log('Linked! Use --watch if the distribution files change and you want to automatically relink new files');	
};

export const publish = command({
	name: 'publish',
	parameters: ['[package paths...]'],
	flags: {
		hard: {
			type: Boolean,
			description: 'Use hard links instead of symlinks',
		},
		watch: {
			type: Boolean,
			alias: 'w',
			description: 'Watch for changes in the package and automatically relink',
		},
	},
	description: 'Only link files that will be published to npm (based on package.json#files)',
}, async (argv) => {
	const cwdProjectPath = process.cwd();
	const { packagePaths } = argv._;
	
	if (packagePaths.length > 0) {
		await Promise.all(
			packagePaths.map(
				linkPackagePath => linkPackage(
					cwdProjectPath,
					linkPackagePath,
					argv.flags,
				),
			),
		);
	}
});
