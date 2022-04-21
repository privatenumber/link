import path from 'path';
import fs from 'fs';
import cmdShim from 'cmd-shim';
import { readPackageJson } from '../utils/read-package-json';
import { linkBinaries } from './link-binaries';
import { symlink } from '../utils/symlink';

const nodeModulesDirectory = 'node_modules';

async function linkBinary(
	binaryPath: string,
	linkPath: string,
) {
	await symlink(
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

	await symlink(
		path.resolve(packagePath),
		symlinkPath,
		'dir',
	);

	await linkBinaries(
		packagePath,
		packageJson,
		(process.platform === 'win32') ? cmdShim : linkBinary,
	);

	return {
		name: packageJson.name,
		path: symlinkPath,
	};
}
