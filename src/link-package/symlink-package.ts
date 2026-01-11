import path from 'path';
import fs from 'fs/promises';
import cmdShim from 'cmd-shim';
import { readPackageJson } from '../utils/read-package-json.js';
import { symlink, symlinkBinary } from '../utils/symlink.js';
import { linkBinaries } from './link-binaries.js';

const nodeModulesDirectory = 'node_modules';

const cmdShimIfExists = async (
	binaryPath: string,
	linkPath: string,
) => {
	try {
		await cmdShim(binaryPath, linkPath);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			console.warn(`Warning: Binary target does not exist: ${binaryPath}`);
			console.warn('When built, ensure it has executable permissions (chmod +x)');
			return;
		}
		throw error;
	}
};

export const symlinkPackage = async (
	basePackagePath: string,
	linkPackagePath: string,
) => {
	const absoluteLinkPackagePath = path.resolve(basePackagePath, linkPackagePath);
	const packageJson = await readPackageJson(absoluteLinkPackagePath);
	const nodeModulesPath = path.join(basePackagePath, nodeModulesDirectory);
	const symlinkPath = path.join(nodeModulesPath, packageJson.name);
	const symlinkDirectory = path.dirname(symlinkPath);

	await fs.mkdir(symlinkDirectory, {
		recursive: true,
	});

	// Link path relative from symlink path
	const targetPath = path.relative(symlinkDirectory, absoluteLinkPackagePath);

	await symlink(
		targetPath,
		symlinkPath,

		/**
		 * On Windows, 'dir' requires admin privileges so use 'junction' instead
		 *
		 * npm also uses junction:
		 * https://github.com/npm/cli/blob/v9.9.3/workspaces/arborist/lib/arborist/reify.js#L738
		 */
		'junction',
	);

	await linkBinaries(
		absoluteLinkPackagePath,
		nodeModulesPath,
		packageJson,
		(process.platform === 'win32') ? cmdShimIfExists : symlinkBinary,
	);

	return {
		name: packageJson.name,
		path: symlinkPath,
		target: targetPath,
	};
};
