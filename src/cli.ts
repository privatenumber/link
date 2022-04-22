import { cli } from 'cleye';
import { linkPackage, linkFromConfig } from './link-package';
import { loadConfig } from './utils/load-config';

(async () => {
	const argv = cli({
		name: 'link',
		parameters: ['[package paths...]'],
		flags: {
			deep: {
				type: Boolean,
				description: 'Run `npx link` on dependencies if they have a link.config.json',
			},
		},
		help: {
			description: 'A better `npm link` -- symlink local dependencies to the current project',

			render(nodes, renderers) {
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
	});

	const linkToPackagePath = process.cwd();
	const { packagePaths } = argv._;

	if (packagePaths.length > 0) {
		await Promise.all(
			packagePaths.map(
				packagePath => linkPackage(
					linkToPackagePath,
					packagePath,
					// argv.flags.deep,
				),
			),
		);
		return;
	}

	const config = await loadConfig(linkToPackagePath);

	if (!config) {
		console.warn('Warning: Config file "link.config.json" not found in current directory.\n         Read the documentation to learn more: https://www.npmjs.com/package/link\n');
		argv.showHelp();
		return;
	}

	await linkFromConfig(
		linkToPackagePath,
		config,
		{
			deep: argv.flags.deep,
		},
	);
})().catch((error) => {
	console.error('Error:', error.message);
	process.exit(1);
});
