import {
	green, red, cyan, magenta,
} from 'kolorist';
import { fsExists } from '../utils/fs-exists';
import type { LinkConfig } from '../types';
import { loadConfig } from '../utils/load-config';
import { symlinkPackage } from './symlink-package';

export async function linkPackage(
	linkToPackagePath: string,
	packagePath: string,
	deep?: boolean,
) {
	const pathExists = await fsExists(packagePath);

	if (!pathExists) {
		console.warn(red('✖'), `Package path does not exist: ${packagePath}`);
		process.exitCode = 1;
		return;
	}

	try {
		const link = await symlinkPackage(linkToPackagePath, packagePath);
		console.log(green('✔'), `Symlinked ${magenta(link.name)}:`, cyan(link.path), '→', cyan(packagePath));
	} catch (error) {
		console.warn(red('✖'), 'Failed to symlink', cyan(packagePath), 'with error:', (error as any).message);
		process.exitCode = 1;
		return;
	}

	if (deep) {
		const config = await loadConfig(packagePath);

		if (config) {
			await linkFromConfig(
				packagePath,
				config,
				{ deep },
			);
		}
	}
}

export async function linkFromConfig(
	linkToPackagePath: string,
	config: LinkConfig,
	options: {
		deep?: boolean;
	},
) {
	if (!config.packages) {
		return;
	}

	const deep = options.deep ?? config.deepLink ?? false;

	await Promise.all(
		config.packages.map(
			async linkPath => await linkPackage(linkToPackagePath, linkPath, deep),
		),
	);
}
