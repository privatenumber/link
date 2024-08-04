import path from 'node:path';
import fs from 'node:fs/promises';
import { command } from 'cleye';
import packlist from 'npm-packlist';
import outdent from 'outdent';
import throttle from 'throttleit';
import globToRegexp from 'glob-to-regexp';
import {
	green, magenta, cyan, bold, dim,
} from 'kolorist';
import { readPackageJson, type PackageJsonWithName } from '../utils/read-package-json';
import { hardlink } from '../utils/symlink';

// Only to silence types
const edgesOut = new Map();

const linkPackage = async (
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

	await throttledHardlinkPackage(basePackagePath, linkPath, absoluteLinkPackagePath, packageJson);

	if (watchMode) {
		const options = {
			globstar: true,
			extended: true,
		};
		const ignoreFiles = [
			// Files
			globToRegexp('**/{npm-debug.log,*.orig,package-lock.json,yarn.lock,pnpm-lock.yaml}', options),

			// Folders
			globToRegexp('**/node_modules/**', options),

			// Hidden files
			globToRegexp('**/.{_*,*.swp,DS_Store,gitignore,npmrc,npmignore,lock-wscript,.wafpickle-*}', options),

			// Hidden folders
			globToRegexp('**/.{_*,git,svn,hg,CVS}/**', options),
		];

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

			const publishFiles = await packlist({
				path: absoluteLinkPackagePath,
				package: packageJson,
				// @ts-expect-error outdated types
				edgesOut,
			});

			if (!publishFiles.includes(filename)) {
				continue;
			}

			console.log(eventType, path.join(absoluteLinkPackagePath, filename));
			await throttledHardlinkPackage(basePackagePath, linkPath, absoluteLinkPackagePath, packageJson);
		}
	}
};

const hardlinkPackage = async (
	basePackagePath: string,
	linkPath: string,
	absoluteLinkPackagePath: string,
	packageJson: PackageJsonWithName,
) => {
	const [
		oldPublishFiles,
		publishFiles,
	] = await Promise.all([
		packlist({
			path: linkPath,

			/**
			 * This is evaluated in the context of the new package.json since that
			 * defines which files belong to the package.
			 */
			package: packageJson,
			// @ts-expect-error outdated types
			edgesOut,
		}),
		packlist({
			path: absoluteLinkPackagePath,
			package: packageJson,
			// @ts-expect-error outdated types
			edgesOut,
		}),
	]);

	console.log(`Symlinking ${magenta(packageJson.name)}:`);
	await Promise.all(
		publishFiles.map(async (file) => {
			const sourcePath = path.join(absoluteLinkPackagePath, file);
			const targetPath = path.join(linkPath, file);

			await fs.mkdir(
				path.dirname(targetPath),
				{ recursive: true },
			);

			await hardlink(sourcePath, targetPath);

			const fileIndex = oldPublishFiles.indexOf(file);
			if (fileIndex > -1) {
				oldPublishFiles.splice(fileIndex, 1);
			}

			console.log(`  ${green('✔')}`, cyan(path.relative(basePackagePath, targetPath)), '→', cyan(path.relative(basePackagePath, sourcePath)));
		}),
	);

	await Promise.all(
		oldPublishFiles.map(async (file) => {
			const cleanPath = path.join(linkPath, file);
			await fs.rm(cleanPath);
		}),
	);
};

export default {
	command: command({
		name: 'publish',
		parameters: ['<package paths...>'],
		flags: {
			watch: {
				type: Boolean,
				alias: 'w',
				description: 'Watch for changes in the package and automatically relink',
			},
		},
		help: {
			description: 'Link a package to simulate an environment similar to `npm install`',
		},
	}),

	handler: async (
		cwdProjectPath: string,
		packagePaths: string[],
		flags: { watch?: boolean },
	) => {
		if (packagePaths.length > 0) {
			await Promise.all(
				packagePaths.map(
					linkPackagePath => linkPackage(
						cwdProjectPath,
						linkPackagePath,
						flags.watch,
					),
				),
			);
		}
	},
};
