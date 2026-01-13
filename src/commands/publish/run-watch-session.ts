import type { FSWatcher } from 'node:fs';
import { gray } from 'kolorist';

type WatchSessionOptions = {
	watchers: FSWatcher[];
	onManualRelink: () => Promise<void>;
};

/**
 * Manages the lifecycle of a watch session: keepalive, stdin handling,
 * signal handlers, and cleanup. Returns when the session ends.
 */
export const runWatchSession = async ({
	watchers,
	onManualRelink,
}: WatchSessionOptions): Promise<void> => {
	if (watchers.length === 0) {
		return;
	}

	let exitWatch!: () => void;
	const keepalive = new Promise<void>((resolve) => {
		exitWatch = resolve;
	});

	// Capture terminal state before modifying
	const { isTTY } = process.stdin;
	const wasRaw = isTTY && process.stdin.isRaw;

	const cleanup = () => {
		// Remove signal handlers to allow process to exit
		process.removeListener('SIGINT', cleanup);
		process.removeListener('SIGTERM', cleanup);

		// Close all watchers
		for (const watcher of watchers) {
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

		// Release the keepalive
		exitWatch();
	};

	const stdinHandler = (data: Buffer) => {
		const key = data[0];
		switch (key) {
			case 13: // \r (Enter)
			case 10: { // \n (Enter)
				console.log(gray('\nManual relink triggered'));
				onManualRelink().catch(console.error);
				break;
			}
			case 3: { // ^C
				cleanup();
				break;
			}
			default: {
				// Ignore other keys
				break;
			}
		}
	};

	console.log(gray('\nWatching for changes... (press Enter to relink all, Ctrl+C to exit)'));

	// Handle graceful shutdown
	process.once('SIGINT', cleanup);
	process.once('SIGTERM', cleanup);

	// Setup stdin for manual retrigger (only in TTY mode)
	if (isTTY) {
		process.stdin.setRawMode(true);
		process.stdin.resume();
		process.stdin.on('data', stdinHandler);
	}

	// Yield to event loop to ensure watcher events can be processed
	await new Promise<void>((resolve) => {
		setImmediate(resolve);
	});

	// Block until cleanup is called
	await keepalive;
};
