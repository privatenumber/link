import path from 'path';
import fs from 'fs';
import cmdShim from 'cmd-shim';
import { readPackageJson } from '../utils/read-package-json';
import { symlink, symlinkBinary } from '../utils/symlink';
import { linkBinaries } from './link-binaries';

const nodeModulesDirectory = 'node_modules';

export async function symlinkPackage(
	basePackagePath: string,
	linkPackagePath: string,
) {
	const absoluteLinkPackagePath = path.resolve(basePackagePath, linkPackagePath);
	const packageJson = await readPackageJson(absoluteLinkPackagePath);
	const nodeModulesPath = path.join(basePackagePath, nodeModulesDirectory);
	const symlinkPath = path.join(nodeModulesPath, packageJson.name);
	const symlinkDirectory = path.dirname(symlinkPath);

	await fs.promises.mkdir(symlinkDirectory, { recursive: true });

	// Link path relative from symlink path
	const targetPath = path.relative(symlinkDirectory, absoluteLinkPackagePath);

	await symlink(
		targetPath,
		symlinkPath,
		'dir',
	);

	await linkBinaries(
		absoluteLinkPackagePath,
		nodeModulesPath,
		packageJson,
		(process.platform === 'win32') ? cmdShim : symlinkBinary,
	);

	return {
		name: packageJson.name,
		path: symlinkPath,
		target: targetPath,
	};
}
