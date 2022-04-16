import path from 'path';
import fs from 'fs';
import { symlink } from '../utils/symlink';
import { readPackageJson } from '../utils/read-package-json';
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
	);

	const binaryPaths = await linkBinaries(
		packagePath,
		packageJson,
		symlink,
	);

	return {
		name: packageJson.name,
		path: symlinkPath,
		binaryPaths,
	};
}
