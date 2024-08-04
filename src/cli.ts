import fs from 'fs/promises';
import { cli } from 'cleye';
import outdent from 'outdent';
import { linkPackage, linkFromConfig } from './link-package';
import { loadConfig } from './utils/load-config';
import { publishCommand, publishHandler } from './commands/publish';

(async () => {
	const argv = cli({
		name: 'link',
		parameters: ['[package paths...]'],
		flags: {
			deep: {
				type: Boolean,
				alias: 'd',
				description: 'Run `npx link` on dependencies if they have a link.config.json',
			},
		},
		help: {
			description: 'A better `npm link` -- symlink local dependencies to the current project',

			render: (nodes, renderers) => {
				nodes[0].data = 'npx link\n';

				nodes.splice(2, 0, {
					type: 'section',
					data: {
						title: 'Website',
						body: 'https://www.npmjs.com/package/link',
					},
				});

				return renderers.render(nodes);
			},
		},
		commands: [
			publishCommand,
		],
	});

	const cwdProjectPath = await fs.realpath(process.cwd());

	if (!argv.command) {
		const { packagePaths } = argv._;

		if (packagePaths.length > 0) {
			await Promise.all(
				packagePaths.map(
					linkPackagePath => linkPackage(
						cwdProjectPath,
						linkPackagePath,
						argv.flags,
					),
				),
			);
			return;
		}

		const config = await loadConfig(cwdProjectPath);

		if (!config) {
			console.warn(
				outdent`
				Warning: Config file "link.config.json" not found in current directory.
							Read the documentation to learn more: https://www.npmjs.com/package/link
				`,
			);
			argv.showHelp();
			return;
		}

		await linkFromConfig(
			cwdProjectPath,
			config,
			{
				deep: argv.flags.deep,
			},
		);
	} else if (argv.command === 'publish') {
		await publishHandler(cwdProjectPath, argv._);
	}
})().catch((error) => {
	console.error('Error:', error.message);
	process.exit(1);
});
