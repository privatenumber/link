import { command } from 'cleye';
import { linkPublishMode } from './link-publish-mode.js';

export const publishCommand = command({
	name: 'publish',
	parameters: ['<package paths...>'],
	flags: {
		// watch: {
		// 	type: Boolean,
		// 	alias: 'w',
		// 	description: 'Watch for changes in the package and automatically relink',
		// },
	},
	help: {
		description: 'Link a package to simulate an environment similar to `npm install`',
	},
});

export const publishHandler = async (
	cwdProjectPath: string,
	packagePaths: string[],
) => {
	if (packagePaths.length > 0) {
		await Promise.all(
			packagePaths.map(
				linkPackagePath => linkPublishMode(
					cwdProjectPath,
					linkPackagePath,
				),
			),
		);
	}
};
