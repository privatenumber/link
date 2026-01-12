import type { FSWatcher } from 'fs';
import { command } from 'cleye';
import { gray } from 'kolorist';
import { linkPublishMode, linkPublishModeWatch } from './link-publish-mode.js';

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

export const publishHandler = async (
	cwdProjectPath: string,
	packagePaths: string[],
	flags: { watch?: boolean },
) => {
	if (packagePaths.length === 0) {
		return;
	}

	if (flags.watch) {
		// Start watchers for all packages concurrently
		const watchers = await Promise.all(
			packagePaths.map(
				linkPackagePath => linkPublishModeWatch(cwdProjectPath, linkPackagePath),
			),
		);

		const activeWatchers = watchers.filter(
			(watcher): watcher is FSWatcher => watcher !== undefined,
		);

		if (activeWatchers.length === 0) {
			return;
		}

		const cleanup = () => {
			for (const watcher of activeWatchers) {
				watcher.close();
			}
		};

		console.log(gray('\nWatching for changes... (press Enter to relink all, Ctrl+C to exit)'));

		const exit = () => {
			cleanup();
			process.exit(0);
		};

		// Handle graceful shutdown (SIGINT when not in raw mode, SIGTERM from kill)
		process.on('SIGINT', exit);
		process.on('SIGTERM', exit);

		// Setup stdin for manual retrigger (only in TTY mode)
		if (process.stdin.isTTY) {
			process.stdin.setRawMode(true);
			process.stdin.resume();
			process.stdin.on('data', (data) => {
				// Enter key - manual relink
				if (data[0] === 13 || data[0] === 10) {
					console.log(gray('\nManual relink triggered'));
					Promise.all(
						packagePaths.map(
							linkPackagePath => linkPublishMode(cwdProjectPath, linkPackagePath),
						),
					).catch(console.error);
				}
				// Ctrl+C in raw mode (byte 0x03)
				if (data[0] === 3) {
					exit();
				}
			});
		}
	} else {
		await Promise.all(
			packagePaths.map(
				linkPackagePath => linkPublishMode(cwdProjectPath, linkPackagePath),
			),
		);
	}
};
