import path from 'path';
import type { PackageJson } from '@npmcli/package-json';
import { fsExists } from './fs-exists.js';
import { readJsonFile } from './read-json-file.js';

type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export type PackageJsonWithName = WithRequired<PackageJson, 'name'>;

export const readPackageJson = async (
	packagePath: string,
) => {
	const packageJsonPath = path.join(packagePath, 'package.json');
	const packageJsonExists = await fsExists(packageJsonPath);

	if (!packageJsonExists) {
		throw new Error(`package.json not found in ${packagePath}`);
	}

	const packageJson = await readJsonFile(packageJsonPath) as PackageJson;

	if (!packageJson.name) {
		throw new Error(`package.json must contain a name: ${packageJsonPath}`);
	}

	return packageJson as PackageJsonWithName;
};
