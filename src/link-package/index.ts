import {
	green, red, cyan, magenta,
} from 'kolorist';
import { fsExists } from '../utils/fs-exists';
import type { LinkConfig } from '../types';
import { loadConfig } from '../utils/load-config';
import { symlinkPackage } from './symlink-package';

export async function linkPackage(
	basePackagePath: string,
	linkPackagePath: string,
	deep?: boolean,
) {
	const pathExists = await fsExists(linkPackagePath);

	if (!pathExists) {
		console.warn(red('✖'), `Package path does not exist: ${linkPackagePath}`);
		process.exitCode = 1;
		return;
	}

	try {
		const link = await symlinkPackage(basePackagePath, linkPackagePath);
		console.log(green('✔'), `Symlinked ${magenta(link.name)}:`, cyan(link.path), '→', cyan(linkPackagePath));
	} catch (error) {
		console.warn(red('✖'), 'Failed to symlink', cyan(linkPackagePath), 'with error:', (error as any).message);
		process.exitCode = 1;
		return;
	}

	if (deep) {
		const config = await loadConfig(linkPackagePath);

		if (config) {
			await linkFromConfig(
				linkPackagePath,
				config,
				{ deep },
			);
		}
	}
}

export async function linkFromConfig(
	basePackagePath: string,
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
			async linkPackagePath => await linkPackage(
				basePackagePath,
				linkPackagePath,
				deep,
			),
		),
	);
}
