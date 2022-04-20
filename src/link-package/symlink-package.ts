import path from 'path';
import fs from 'fs';
import cmdShim from 'cmd-shim';
import { promisify } from 'util';
import { readPackageJson } from '../utils/read-package-json';
import { linkBinaries } from './link-binaries';

const nodeModulesDirectory = 'node_modules';

async function linkBinary(
	binaryPath: string,
	linkPath: string,
) {
	await fs.promises.symlink(
		binaryPath,
		linkPath,
	);

	await fs.promises.chmod(linkPath, 0o755);
}

export async function symlinkPackage(
	packagePath: string,
) {
	const packageJson = await readPackageJson(packagePath);

	const symlinkPath = path.join(nodeModulesDirectory, packageJson.name);

	await fs.promises.mkdir(path.dirname(symlinkPath), { recursive: true });

	await fs.promises.symlink(
		path.resolve(packagePath),
		symlinkPath,
		'dir',
	);

	const binaryPaths = await linkBinaries(
		packagePath,
		packageJson,
		(process.platform === 'win32') ? promisify(cmdShim) : linkBinary,
	);

	return {
		name: packageJson.name,
		path: symlinkPath,
		binaryPaths,
	};
}
