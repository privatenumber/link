import path from 'node:path';
import fs from 'node:fs/promises';
import outdent from 'outdent';
import throttle from 'throttleit';
import globToRegexp from 'glob-to-regexp';
import { magenta, bold, dim } from 'kolorist';
import { readPackageJson } from '../../utils/read-package-json';
import { getNpmPacklist } from '../../utils/get-npm-packlist';
import { hardlinkPackage } from './hardlink-package';

export const linkPublishMode = async (
	basePackagePath: string,
	linkPackagePath: string,
	watchMode?: boolean,
) => {
	const absoluteLinkPackagePath = path.resolve(basePackagePath, linkPackagePath);
	const packageJson = await readPackageJson(absoluteLinkPackagePath);
	const expectedPrefix = path.join(basePackagePath, 'node_modules/');
	const linkPath = path.join(expectedPrefix, packageJson.name);
	const linkPathStat = await fs.stat(linkPath).catch(() => null);

	if (!linkPathStat?.isDirectory()) {
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

	const throttledHardlinkPackage = throttle(hardlinkPackage, 500);

	await throttledHardlinkPackage(
		basePackagePath,
		linkPath,
		absoluteLinkPackagePath,
		packageJson,
	);

	if (watchMode) {
		const options = {
			globstar: true,
			extended: true,
		};
		const ignoreFiles = [
			// Files
			'**/{npm-debug.log,*.orig,package-lock.json,yarn.lock,pnpm-lock.yaml}',

			// Folders
			'**/node_modules/**',

			// Hidden files
			'**/.{_*,*.swp,DS_Store,gitignore,npmrc,npmignore,lock-wscript,.wafpickle-*}',

			// Hidden folders
			'**/.{_*,git,svn,hg,CVS}/**',
		].map(glob => globToRegexp(glob, options));

		const ac = new AbortController();
		const watcher = fs.watch(
			absoluteLinkPackagePath,
			{
				recursive: true,
				signal: ac.signal,
			},
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

			console.log(eventType, path.join(absoluteLinkPackagePath, filename));
			await throttledHardlinkPackage(
				basePackagePath,
				linkPath,
				absoluteLinkPackagePath,
				packageJson,
				publishFiles,
			);
		}
	}
};
