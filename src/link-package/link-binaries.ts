import path from 'path';
import fs from 'fs';
import type { PackageJson } from 'type-fest';

const binDirectoryPath = 'node_modules/.bin';

async function linkBinary(
	binaryPath: string,
	linkPath: string,
	linkFunction: (targetPath: string, linkPath: string) => Promise<void>,
) {
	await linkFunction(
		binaryPath,
		linkPath,
	);

	await fs.promises.chmod(linkPath, 0o755);

	return linkPath;
}

export async function linkBinaries(
	packagePath: string,
	{
		name,
		bin,
	}: PackageJson,
	linkFunction: (targetPath: string, linkPath: string) => Promise<void>,
) {
	if (!bin) {
		return [];
	}

	await fs.promises.mkdir(binDirectoryPath, {
		recursive: true,
	});

	if (typeof bin === 'string') {
		return [
			await linkBinary(
				path.resolve(packagePath, bin),
				path.join(binDirectoryPath, name!),
				linkFunction,
			),
		];
	}

	return await Promise.all(
		Object.entries(bin).map(
			async ([binaryName, binaryPath]) => await linkBinary(
				path.resolve(packagePath, binaryPath),
				path.join(binDirectoryPath, binaryName),
				linkFunction,
			),
		),
	);
}
