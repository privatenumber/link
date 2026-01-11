import path from 'path';
import fs from 'fs/promises';
import debounce from 'debounce';
import globToRegexp from 'glob-to-regexp';
import outdent from 'outdent';
import {
	magenta, bold, dim, cyan, yellow,
} from 'kolorist';
import { readPackageJson } from '../../utils/read-package-json.js';
import { getNpmPacklist } from '../../utils/get-npm-packlist.js';
import { cwdPath } from '../../utils/cwd-path.js';
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

const getTimestamp = () => {
	const now = new Date();
	return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
};

/**
 * npm-packlist ignore patterns
 * https://github.com/npm/npm-packlist/blob/v8.0.2/lib/index.js#L15-L38
 */
const ignorePatterns = [
	'**/{npm-debug.log,*.orig,package-lock.json,yarn.lock,pnpm-lock.yaml}',
	'**/node_modules/**',
	'**/.{_*,*.swp,DS_Store,gitignore,npmrc,npmignore,lock-wscript,.wafpickle-*}',
	'**/.{_*,git,svn,hg,CVS}/**',
].map(glob => globToRegexp(glob, {
	globstar: true,
	extended: true,
}));

const shouldIgnoreFile = (filename: string) => ignorePatterns.some(
	pattern => pattern.test(filename),
);

export const linkPublishMode = async (
	basePackagePath: string,
	linkPackagePath: string,
	watch?: boolean,
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

	await hardlinkPackage(
		linkPath,
		absoluteLinkPackagePath,
		packageJson,
	);

	if (!watch) {
		return;
	}

	const debouncedHardlinkPackage = debounce(hardlinkPackage, 500);

	console.log(dim('\nWatching for changes... (press Enter to manually relink)\n'));

	// Listen for Enter key to manually retrigger
	process.stdin.setRawMode?.(true);
	process.stdin.resume();
	process.stdin.on('data', async (data) => {
		// Enter key or 'r' key
		if (data[0] === 13 || data[0] === 114) {
			console.log(`\n${dim(getTimestamp())} Manual relink triggered\n`);
			await debouncedHardlinkPackage(linkPath, absoluteLinkPackagePath, packageJson);
		}
		// Ctrl+C
		if (data[0] === 3) {
			process.exit(0);
		}
	});

	const watcher = fs.watch(absoluteLinkPackagePath, { recursive: true });

	for await (const { eventType, filename } of watcher) {
		if (!filename || shouldIgnoreFile(filename)) {
			continue;
		}

		const publishFiles = await getNpmPacklist(absoluteLinkPackagePath, packageJson);
		if (!publishFiles.includes(filename)) {
			continue;
		}

		console.log(
			`\n${dim(getTimestamp())}`,
			'Detected',
			yellow(eventType),
			'in',
			cyan(cwdPath(path.join(absoluteLinkPackagePath, filename))),
			'\n',
		);

		await debouncedHardlinkPackage(linkPath, absoluteLinkPackagePath, packageJson);
	}
};
