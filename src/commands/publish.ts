import path from 'path';
import fs from 'fs/promises';
import { command } from 'cleye';
import packlist from 'npm-packlist';
import { readPackageJson } from '../utils/read-package-json';
import { createFakeTarball } from '../utils/create-fake-tarball';
import { symlink } from '../utils/symlink';
import { fsExists } from '../utils/fs-exists';

const linkPackage = async (
	basePackagePath: string,
	linkPackagePath: string,
	options?: {
		hard?: boolean;
	},
) => {
	const absoluteLinkPackagePath = path.resolve(basePackagePath, linkPackagePath);
	const packageJson = await readPackageJson(absoluteLinkPackagePath);

	const linkPath = path.join(basePackagePath, 'node_modules', packageJson.name);
	const linkPathCheck = path.join(linkPath, '..link');

	const isSetUp = await fs.readFile(linkPathCheck, 'utf8').catch(() => '') === absoluteLinkPackagePath;
	if (!isSetUp) {
		const tarballPath = await createFakeTarball(absoluteLinkPackagePath);
		console.log('Install the following tarball with the package manager of your choice:');
		console.log('  npm install --no-save', tarballPath);
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
				if (await fsExists(targetPath)) {
					await fs.rm(targetPath, {
						recursive: true,
					});
				}

				await fs.link(
					sourcePath,
					targetPath,
				);
			} else {
				await symlink(
					sourcePath,
					targetPath,
				);	
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
