import path from 'path';
import fs from 'fs';
import cmdShim from 'cmd-shim';
import { readPackageJson } from '../utils/read-package-json';
import { symlink, symlinkBinary } from '../utils/symlink';
import { linkBinaries } from './link-binaries';

const nodeModulesDirectory = 'node_modules';

export async function symlinkPackage(
	packagePath: string,
) {
	const packageJson = await readPackageJson(packagePath);

	const symlinkPath = path.join(nodeModulesDirectory, packageJson.name);

	await fs.promises.mkdir(path.dirname(symlinkPath), { recursive: true });

	await symlink(
		path.resolve(packagePath),
		symlinkPath,
		'dir',
	);

	await linkBinaries(
		packagePath,
		packageJson,
		(process.platform === 'win32') ? cmdShim : symlinkBinary,
	);

	return {
		name: packageJson.name,
		path: symlinkPath,
	};
}
