import { command } from 'cleye';
import { linkPublishMode } from './link-publish-mode.js';

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
					linkPackagePath => linkPublishMode(
						cwdProjectPath,
						linkPackagePath,
						flags.watch,
					),
				),
			);
		}
	},
};
