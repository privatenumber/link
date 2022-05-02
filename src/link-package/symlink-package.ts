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
	const packageJson = await readPackageJson(linkPackagePath);

	const symlinkPath = path.join(basePackagePath, nodeModulesDirectory, packageJson.name);

	await fs.promises.mkdir(path.dirname(symlinkPath), { recursive: true });

	await symlink(
		path.resolve(linkPackagePath),
		symlinkPath,
		'dir',
	);

	await linkBinaries(
		linkPackagePath,
		packageJson,
		(process.platform === 'win32') ? cmdShim : symlinkBinary,
	);

	return {
		name: packageJson.name,
		path: symlinkPath,
	};
}
