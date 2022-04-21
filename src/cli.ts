import { cli } from 'cleye';
import terminalLink from 'terminal-link';
import { linkPackage } from './link-package';
import { loadConfig } from './utils/load-config';

(async () => {
	const argv = cli({
		name: 'link',
		parameters: ['[package paths...]'],
		help: {
			description: 'A better `npm link` -- symlink local dependencies to the current project',

			render(nodes, renderers) {
				nodes[0].data = 'npx link\n';

				nodes.splice(2, 0, {
					type: 'section',
					data: {
						title: 'Website',
						body: 'https://www.npmjs.com/package/link'
					},
				});

				return renderers.render(nodes);
			},
		},
	});

	const { packagePaths } = argv._;

	if (packagePaths.length > 0) {
		await Promise.all(
			packagePaths.map(
				packagePath => linkPackage(packagePath),
			),
		);

		return;
	}

	const config = await loadConfig();

	if (!config) {
		console.warn(`Warning: Config file "link.config.json" not found in current directory.\n         Read the documentation to learn more: https://www.npmjs.com/package/link\n`);
		argv.showHelp();
		return;
	}

	if (!config.packages) {
		return;
	}

	await Promise.all(
		config.packages.map(
			async linkPath => await linkPackage(linkPath),
		),
	);
})().catch((error) => {
	console.error('Error:', error.message);
	process.exit(1);
});
