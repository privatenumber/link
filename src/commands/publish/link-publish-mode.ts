import path from 'path';
import fs from 'fs/promises';
import outdent from 'outdent';
import { magenta, bold, dim } from 'kolorist';
import { readPackageJson } from '../../utils/read-package-json.js';
import { hardlinkPackage } from './hardlink-package.js';

const isValidSetup = async (
	linkPath: string,
	expectedPrefix: string,
) => {
	const linkPathStat = await fs.stat(linkPath).catch(() => null);
	if (!linkPathStat?.isDirectory()) {
		return false;
	}

	/**
	 * If it's a symlink, make sure it's in the node_modules directory of the base package.
	 * e.g. This could happen with pnpm
	 *
	 * If it's not, it might be a development directory and we don't want to overwrite it.
	 */
	const linkPathReal = await fs.realpath(linkPath);
	return linkPathReal.startsWith(expectedPrefix);
};

export const linkPublishMode = async (
	basePackagePath: string,
	linkPackagePath: string,
) => {
	const absoluteLinkPackagePath = path.resolve(basePackagePath, linkPackagePath);
	const packageJson = await readPackageJson(absoluteLinkPackagePath);
	const expectedPrefix = path.join(basePackagePath, 'node_modules/');
	const linkPath = path.join(expectedPrefix, packageJson.name);

	if (!(await isValidSetup(linkPath, expectedPrefix))) {
		console.error(
			outdent`
			Error: Package ${magenta(packageJson.name)} is not set up
	
			${bold('Setup instructions')}
			1. In the Dependency package, create a tarball:
			  ${dim('$ npm pack')}
	
			2. In the Consuming package, install the tarball and link the Dependency:
			  ${dim('$ npm install --no-save <dependency-tarball>')}
			  ${dim('$ npx link publish <dependency-path>')}
	
			3. Start developing!
	
			Learn more: https://npmjs.com/link
			`,
		);
		return;
	}

	/**
	 * If it's a symlink, make sure it's in the node_modules directory of the base package.
	 * e.g. This could happen with pnpm
	 *
	 * If it's not, it might be a development directory and we don't want to overwrite it.
	 */
	const linkPathReal = await fs.realpath(linkPath);
	if (!linkPathReal.startsWith(expectedPrefix)) {
		return;
	}

	await hardlinkPackage(
		linkPath,
		absoluteLinkPackagePath,
		packageJson,
	);
};
