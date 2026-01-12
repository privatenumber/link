import path from 'path';
import fs from 'fs/promises';
import { watch, type FSWatcher } from 'fs';
import outdent from 'outdent';
import {
	magenta, bold, dim, gray, red,
} from 'kolorist';
import { getNpmPacklist } from '../../utils/get-npm-packlist.js';
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

const debounce = <T extends (...arguments_: unknown[]) => unknown>(
	callback: T,
	delay: number,
) => {
	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	return (...arguments_: Parameters<T>) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => callback(...arguments_), delay);
	};
};

const setupPublishLink = async (basePackagePath: string, linkPackagePath: string) => {
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

	return {
		absoluteLinkPackagePath,
		packageJson,
		linkPath,
	};
};

export const linkPublishMode = async (
	basePackagePath: string,
	linkPackagePath: string,
): Promise<void> => {
	const setup = await setupPublishLink(basePackagePath, linkPackagePath);
	if (!setup) {
		return;
	}

	await hardlinkPackage(setup.linkPath, setup.absoluteLinkPackagePath, setup.packageJson);
};

export const linkPublishModeWatch = async (
	basePackagePath: string,
	linkPackagePath: string,
): Promise<FSWatcher | undefined> => {
	const setup = await setupPublishLink(basePackagePath, linkPackagePath);
	if (!setup) {
		return;
	}

	const { absoluteLinkPackagePath, packageJson, linkPath } = setup;

	// Cache the list of files that would be published
	let publishFiles = new Set(await getNpmPacklist(absoluteLinkPackagePath, packageJson));

	// In-flight guard to prevent overlapping relinks
	let relinkInProgress = false;
	let relinkQueued = false;

	const relink = async () => {
		if (relinkInProgress) {
			relinkQueued = true;
			return;
		}

		relinkInProgress = true;
		console.log(gray(`\n[${new Date().toLocaleTimeString()}] Relinking ${magenta(packageJson.name)}...`));
		try {
			await hardlinkPackage(linkPath, absoluteLinkPackagePath, packageJson);
		} catch (error) {
			console.error(red(`Failed to relink ${packageJson.name}:`), error);
		} finally {
			relinkInProgress = false;
			if (relinkQueued) {
				relinkQueued = false;
				relink().catch(() => {});
			}
		}
	};

	await relink();

	const debouncedRelink = debounce(() => {
		relink().catch(() => {});
	}, 200);

	// Files that affect what gets published
	const packlistConfigFiles = new Set(['package.json', '.npmignore', '.gitignore']);

	const refreshPacklist = async () => {
		const newPackageJson = await readPackageJson(absoluteLinkPackagePath);
		const files = await getNpmPacklist(absoluteLinkPackagePath, newPackageJson);
		publishFiles = new Set(files);
	};

	// Track if we've already warned about packlist refresh failures
	let packlistRefreshErrorLogged = false;
	const logPacklistRefreshError = (error: unknown) => {
		if (!packlistRefreshErrorLogged) {
			packlistRefreshErrorLogged = true;
			console.warn(gray(`Packlist refresh failed; watch may miss newly publishable files: ${error}`));
		}
	};

	// Queue unknown files and batch-process them to avoid repeated packlist refreshes
	const pendingUnknownFiles = new Set<string>();
	const processPendingFiles = debounce(() => {
		const files = [...pendingUnknownFiles];
		pendingUnknownFiles.clear();

		refreshPacklist()
			.then(() => {
				const hasNewPublishable = files.some(file => publishFiles.has(file));
				if (hasNewPublishable) {
					debouncedRelink();
				}
			})
			.catch(logPacklistRefreshError);
	}, 100);

	const handleFileChange = (normalizedFilename: string) => {
		// Config files affect what's published, so refresh the cache and relink
		if (packlistConfigFiles.has(normalizedFilename)) {
			refreshPacklist()
				.then(() => debouncedRelink())
				.catch(logPacklistRefreshError);
			return;
		}

		// Fast path: file is already known to be published
		if (publishFiles.has(normalizedFilename)) {
			debouncedRelink();
			return;
		}

		// Skip obviously ignored paths
		if (normalizedFilename.startsWith('.git/') || normalizedFilename.startsWith('node_modules/')) {
			return;
		}

		// Unknown file - queue for batch processing
		pendingUnknownFiles.add(normalizedFilename);
		processPendingFiles();
	};

	// Throttle null filename warnings to avoid spam on platforms with noisy watchers
	let nullFilenameWarned = false;

	const watcher = watch(absoluteLinkPackagePath, { recursive: true }, (_eventType, filename) => {
		// Null filename can occur on some platforms - trigger a full relink to be safe
		if (!filename) {
			if (!nullFilenameWarned) {
				nullFilenameWarned = true;
				console.warn(gray('Received watch event with no filename, triggering relink'));
			}
			debouncedRelink();
			return;
		}

		// Normalize path separators for Windows compatibility
		const normalizedFilename = filename.replaceAll('\\', '/');
		handleFileChange(normalizedFilename);
	});

	return watcher;
};
