import path from 'node:path';
import fs from 'node:fs/promises';
import { watch, type FSWatcher } from 'node:fs';
import outdent from 'outdent';
import {
	magenta, bold, dim, gray, red,
} from 'kolorist';
import { getNpmPacklist } from '../../utils/get-npm-packlist.js';
import { readPackageJson, type PackageJsonWithName } from '../../utils/read-package-json.js';
import { hardlinkPackage } from './hardlink-package.js';

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

type RelinkerOptions = {
	linkPath: string;
	absoluteLinkPackagePath: string;
	packageJson: PackageJsonWithName;
};

const createRelinker = ({
	linkPath,
	absoluteLinkPackagePath,
	packageJson,
}: RelinkerOptions) => {
	let inProgress = false;
	let queued = false;

	const relink = async () => {
		if (inProgress) {
			queued = true;
			return;
		}

		inProgress = true;
		console.log(gray(`\n[${new Date().toLocaleTimeString()}] Relinking ${magenta(packageJson.name)}...`));
		try {
			await hardlinkPackage(linkPath, absoluteLinkPackagePath, packageJson);
		} catch (error) {
			console.error(red(`Failed to relink ${packageJson.name}:`), error);
		} finally {
			inProgress = false;
			if (queued) {
				queued = false;
				relink().catch(() => {});
			}
		}
	};

	const debouncedRelink = debounce(() => {
		relink().catch(() => {});
	}, 200);

	return {
		relink,
		debouncedRelink,
	};
};

type PacklistTrackerOptions = {
	absoluteLinkPackagePath: string;
	packageJson: PackageJsonWithName;
	onRelink: () => void;
};

const createPacklistTracker = ({
	absoluteLinkPackagePath,
	packageJson,
	onRelink,
}: PacklistTrackerOptions) => {
	let publishFiles: Set<string>;
	let refreshErrorLogged = false;

	const packlistConfigFiles = new Set(['package.json', '.npmignore', '.gitignore']);

	const logRefreshError = (error: unknown) => {
		if (!refreshErrorLogged) {
			refreshErrorLogged = true;
			console.warn(gray(`Packlist refresh failed; watch may miss newly publishable files: ${error}`));
		}
	};

	const refresh = async () => {
		const newPackageJson = await readPackageJson(absoluteLinkPackagePath);
		const files = await getNpmPacklist(absoluteLinkPackagePath, newPackageJson);
		publishFiles = new Set(files);
	};

	const refreshAndRelink = () => {
		refresh()
			.then(() => onRelink())
			.catch(logRefreshError);
	};

	// Queue unknown files and batch-process them
	const pendingUnknownFiles = new Set<string>();
	const processPendingFiles = debounce(() => {
		const files = [...pendingUnknownFiles];
		pendingUnknownFiles.clear();

		refresh()
			.then(() => {
				if (files.some(file => publishFiles.has(file))) {
					onRelink();
				}
			})
			.catch(logRefreshError);
	}, 100);

	const isIgnored = (filename: string) => (
		filename.startsWith('.git/') || filename.startsWith('node_modules/')
	);

	const handleFileChange = (filename: string) => {
		if (isIgnored(filename)) {
			return;
		}

		if (packlistConfigFiles.has(filename)) {
			refreshAndRelink();
			return;
		}

		if (publishFiles.has(filename)) {
			onRelink();
			return;
		}

		// Unknown file - queue for batch processing
		pendingUnknownFiles.add(filename);
		processPendingFiles();
	};

	const initialize = async () => {
		publishFiles = new Set(await getNpmPacklist(absoluteLinkPackagePath, packageJson));
	};

	return {
		initialize,
		handleFileChange,
	};
};

const startRecursiveWatch = (
	directory: string,
	onFile: (filename: string | null) => void,
): FSWatcher | undefined => {
	try {
		return watch(directory, { recursive: true }, (_eventType, filename) => {
			// Normalize path separators for Windows compatibility
			const normalizedFilename = filename?.replaceAll('\\', '/') ?? null;
			onFile(normalizedFilename);
		});
	} catch (error) {
		// Recursive watching may not be supported (Linux < Node 19.1.0)
		console.error(red('Watch mode failed to start:'), (error as Error).message);
		console.error(gray('Recursive watching requires Node.js v19.1.0+ on Linux.'));
		console.error(gray('Run without --watch and manually relink after builds.'));
		return undefined;
	}
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

	const { relink, debouncedRelink } = createRelinker({
		linkPath,
		absoluteLinkPackagePath,
		packageJson,
	});

	const packlistTracker = createPacklistTracker({
		absoluteLinkPackagePath,
		packageJson,
		onRelink: debouncedRelink,
	});

	await packlistTracker.initialize();
	await relink();

	// Throttle null filename warnings
	let nullFilenameWarned = false;

	const watcher = startRecursiveWatch(absoluteLinkPackagePath, (filename) => {
		if (!filename) {
			if (!nullFilenameWarned) {
				nullFilenameWarned = true;
				console.warn(gray('Received watch event with no filename, triggering relink'));
			}
			debouncedRelink();
			return;
		}

		packlistTracker.handleFileChange(filename);
	});

	return watcher;
};
