import packlist from 'npm-packlist';
import type { PackageJson } from '@npmcli/package-json';

// Only to silence types
const edgesOut = new Map();

export const getNpmPacklist = (
	absoluteLinkPackagePath: string,
	packageJson: PackageJson,
) => packlist({
	path: absoluteLinkPackagePath,
	package: packageJson,
	// @ts-expect-error outdated types
	edgesOut,
});
