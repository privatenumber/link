import packlist from 'npm-packlist';
import type { PackageJson } from '@npmcli/package-json';

// Only to silence types
const edgesOut = new Map();

export const getNpmPacklist = (
	absoluteLinkPackagePath: string,
	packageJson: PackageJson,
	// @ts-expect-error npm-packlist types expect full Node, but minimal tree object works
) => packlist({
	path: absoluteLinkPackagePath,
	package: packageJson,
	edgesOut,
});
