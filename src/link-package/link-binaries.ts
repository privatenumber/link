import path from 'path';
import fs from 'fs';
import type { PackageJson } from 'type-fest';

const binDirectoryPath = 'node_modules/.bin';

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
			await linkFunction(
				path.resolve(packagePath, bin),
				path.join(binDirectoryPath, name!),
			),
		];
	}

	return await Promise.all(
		Object.entries(bin).map(
			async ([binaryName, binaryPath]) => await linkFunction(
				path.resolve(packagePath, binaryPath),
				path.join(binDirectoryPath, binaryName),
			),
		),
	);
}
