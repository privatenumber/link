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

		// Capture terminal state before modifying
		const { isTTY } = process.stdin;
		const wasRaw = isTTY && process.stdin.isRaw;

		const stdinHandler = (data: Buffer) => {
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
				cleanup();
			}
		};

		const cleanup = () => {
			// Close all watchers
			for (const watcher of activeWatchers) {
				try {
					watcher.close();
				} catch {
					// Ignore errors when closing watchers
				}
			}

			// Restore terminal state
			if (isTTY) {
				process.stdin.removeListener('data', stdinHandler);
				process.stdin.setRawMode(wasRaw ?? false);
				process.stdin.pause();
			}

			// Remove signal handlers
			process.removeListener('SIGINT', cleanup);
			process.removeListener('SIGTERM', cleanup);
		};

		console.log(gray('\nWatching for changes... (press Enter to relink all, Ctrl+C to exit)'));

		// Handle graceful shutdown (use once to avoid leaking handlers)
		process.once('SIGINT', cleanup);
		process.once('SIGTERM', cleanup);

		// Setup stdin for manual retrigger (only in TTY mode)
		if (isTTY) {
			process.stdin.setRawMode(true);
			process.stdin.resume();
			process.stdin.on('data', stdinHandler);
		}
	} else {
		await Promise.all(
			packagePaths.map(
				linkPackagePath => linkPublishMode(cwdProjectPath, linkPackagePath),
			),
		);
	}
};
