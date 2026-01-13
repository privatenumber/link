import type { FSWatcher } from 'node:fs';
import { command } from 'cleye';
import { linkPublishMode, linkPublishModeWatch } from './link-publish-mode.js';
import { runWatchSession } from './run-watch-session.js';

export const publishCommand = command({
	name: 'publish',
	parameters: ['<package paths...>'],
	flags: {
		watch: {
			type: Boolean,
			alias: 'w',
			description: 'Watch for changes and automatically relink',
		},
	},
	help: {
		description: 'Link a package to simulate an environment similar to `npm install`',
	},
});

const relinkAll = (
	cwdProjectPath: string,
	packagePaths: string[],
) => Promise.all(
	packagePaths.map(
		packagePath => linkPublishMode(cwdProjectPath, packagePath),
	),
);

export const publishHandler = async (
	cwdProjectPath: string,
	packagePaths: string[],
	flags: { watch?: boolean },
) => {
	if (packagePaths.length === 0) {
		return;
	}

	if (!flags.watch) {
		await relinkAll(cwdProjectPath, packagePaths);
		return;
	}

	// Start watchers for all packages concurrently
	const watchers = await Promise.all(
		packagePaths.map(
			packagePath => linkPublishModeWatch(cwdProjectPath, packagePath),
		),
	);

	const activeWatchers = watchers.filter(
		(watcher): watcher is FSWatcher => watcher !== undefined,
	);

	await runWatchSession({
		watchers: activeWatchers,
		onManualRelink: () => relinkAll(cwdProjectPath, packagePaths),
	});
};
