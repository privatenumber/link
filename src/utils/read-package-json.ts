import path from 'path';
import type { PackageJson } from 'type-fest';
import { fsExists } from './fs-exists';
import { readJsonFile } from './read-json-file';

type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export const readPackageJson = async (
	packagePath: string,
) => {
	const packageJsonPath = path.join(packagePath, 'package.json');
	const packageJsonExists = await fsExists(packageJsonPath);

	if (!packageJsonExists) {
		throw new Error(`package.json not found in ${packagePath}`);
	}

	const packageJson = await readJsonFile<PackageJson>(packageJsonPath);

	if (!packageJson.name) {
		throw new Error(`package.json must contain a name: ${packageJsonPath}`);
	}

	return packageJson as WithRequired<PackageJson, 'name'>;
};
