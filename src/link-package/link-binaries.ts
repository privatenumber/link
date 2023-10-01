import path from 'path';
import fs from 'fs';
import type { PackageJson } from 'type-fest';

export const linkBinaries = async (
	linkPackagePath: string,
	nodeModulesPath: string,
	{
		name,
		bin,
	}: PackageJson,
	linkFunction: (targetPath: string, linkPath: string) => Promise<void>,
) => {
	if (!bin) {
		return [];
	}

	if (name?.startsWith('@')) {
		[, name] = name.split('/');
	}

	const binDirectoryPath = path.join(nodeModulesPath, '.bin');

	await fs.promises.mkdir(binDirectoryPath, {
		recursive: true,
	});

	if (typeof bin === 'string') {
		await linkFunction(
			path.resolve(linkPackagePath, bin),
			path.join(binDirectoryPath, name!),
		);
		return;
	}

	await Promise.all(
		Object.entries(bin).map(
			async ([binaryName, binaryPath]) => await linkFunction(
				path.resolve(linkPackagePath, binaryPath!),
				path.join(binDirectoryPath, binaryName),
			),
		),
	);
};
