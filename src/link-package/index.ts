import path from 'path';
import {
	green, red, cyan, magenta,
} from 'kolorist';
import { fsExists } from '../utils/fs-exists.js';
import type { LinkConfig } from '../types.js';
import { loadConfig } from '../utils/load-config.js';
import { symlinkPackage } from './symlink-package.js';

export const linkPackage = async (
	basePackagePath: string,
	linkPackagePath: string,
	options: {
		deep?: boolean;
	},
) => {
	const absoluteLinkPackagePath = path.resolve(basePackagePath, linkPackagePath);
	const pathExists = await fsExists(absoluteLinkPackagePath);

	if (!pathExists) {
		console.warn(red('✖'), `Package path does not exist: ${linkPackagePath}`);
		process.exitCode = 1;
		return;
	}

	try {
		const link = await symlinkPackage(
			basePackagePath,
			linkPackagePath,
		);
		console.log(green('✔'), `Symlinked ${magenta(link.name)}:`, cyan(link.path), '→', cyan(link.target));
	} catch (error) {
		console.warn(red('✖'), 'Failed to symlink', cyan(linkPackagePath), 'with error:', (error as Error).message);
		process.exitCode = 1;
		return;
	}

	if (options.deep) {
		const config = await loadConfig(absoluteLinkPackagePath);

		if (config) {
			await linkFromConfig(
				absoluteLinkPackagePath,
				config,
				options,
			);
		}
	}
};

export const linkFromConfig = async (
	basePackagePath: string,
	config: LinkConfig,
	options: {
		deep?: boolean;
	},
) => {
	if (!config.packages) {
		return;
	}

	const newOptions = {
		deep: options.deep ?? config.deepLink ?? false,
	};

	await Promise.all(
		config.packages.map(
			async linkPackagePath => await linkPackage(
				basePackagePath,
				linkPackagePath,
				newOptions,
			),
		),
	);
};
