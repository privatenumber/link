import { command } from 'cleye';
import { linkPublishMode } from './link-publish-mode.js';

export const publishCommand = command({
	name: 'publish',
	parameters: ['<package paths...>'],
	flags: {
		watch: {
			type: Boolean,
			alias: 'w',
			description: 'Watch for changes in the package and automatically relink',
		},
		litmus: {
			type: String,
			alias: 'l',
			description: "If using the --watch flag, look for this file in the linked package to see if it's ready to re-link",
		},
		delay: {
			type: Number,
			alias: 'd',
			description: 'If using the --watch flag without the litmus flag, wait this amount of time (in ms) after detecting changes before refreshing the packlist and re-linking',
			default: 2000,
		},
		interval: {
			type: Number,
			alias: 'i',
			description: 'If using the --watch flag, poll for completed builds at this frequency (in ms)',
			default: 500,
		},
		maxBuildTime: {
			type: Number,
			alias: 'm',
			description: 'If using the --watch flag, the maximum amount of time to wait for all expected files to appear before re-linking',
			default: 30000,
		},
	},
	help: {
		description: 'Link a package to simulate an environment similar to `npm install`',
	},
});

export const publishHandler = async (
	cwdProjectPath: string,
	packagePaths: string[],
	flags: {
		watch?: boolean,
		litmus?: string,
		delay: number,
		interval: number,
		maxBuildTime: number,
	},
) => {
	if (packagePaths.length > 0) {
		await Promise.all(
			packagePaths.map(
				linkPackagePath => linkPublishMode(
					cwdProjectPath,
					linkPackagePath,
					flags.watch,
					flags.litmus,
					flags.delay,
					flags.interval,
					flags.maxBuildTime,
				),
			),
		);
	}
};
