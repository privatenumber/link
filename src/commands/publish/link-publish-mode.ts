import path from 'node:path';
import fs from 'node:fs/promises';
import outdent from 'outdent';
import throttle from 'throttleit';
import globToRegexp from 'glob-to-regexp';
import {
	magenta, cyan, bold, dim, yellow,
} from 'kolorist';
import { readPackageJson } from '../../utils/read-package-json.js';
import { getNpmPacklist } from '../../utils/get-npm-packlist.js';
import { cwdPath } from '../../utils/cwd-path.js';
import { getPrettyTime } from '../../utils/get-pretty-time.js';
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
	watchMode?: boolean,
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

	const throttledHardlinkPackage = throttle(hardlinkPackage, 500);
	await throttledHardlinkPackage(
		linkPath,
		absoluteLinkPackagePath,
		packageJson,
	);

	if (watchMode) {
		const globOptions = {
			globstar: true,
			extended: true,
		};

		/**
		 * npm-packlist ignore list:
		 * https://github.com/npm/npm-packlist/blob/v8.0.2/lib/index.js#L15-L38
		 */
		const ignoreFiles = [
			// Files
			'**/{npm-debug.log,*.orig,package-lock.json,yarn.lock,pnpm-lock.yaml}',

			// Folders
			'**/node_modules/**',

			// Hidden files
			'**/.{_*,*.swp,DS_Store,gitignore,npmrc,npmignore,lock-wscript,.wafpickle-*}',

			// Hidden folders
			'**/.{_*,git,svn,hg,CVS}/**',
		].map(glob => globToRegexp(glob, globOptions));

		const watcher = fs.watch(
			absoluteLinkPackagePath,
			{ recursive: true },
		);

		for await (const { eventType, filename } of watcher) {
			if (!filename) {
				continue;
			}

			const shouldIgnore = ignoreFiles.some(ignoreFile => ignoreFile.test(filename));
			if (shouldIgnore) {
				continue;
			}

			const publishFiles = await getNpmPacklist(
				absoluteLinkPackagePath,
				packageJson,
			);

			if (!publishFiles.includes(filename)) {
				continue;
			}

			console.log(`\n${dim(getPrettyTime())}`, 'Detected', yellow(eventType), 'in', `${cyan(cwdPath(path.join(absoluteLinkPackagePath, filename)))}\n`);
			await throttledHardlinkPackage(
				linkPath,
				absoluteLinkPackagePath,
				packageJson,
				publishFiles,
			);
		}
	}
};
