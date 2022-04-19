import { cli } from 'cleye';
import { linkPackage } from './link-package';
import { loadConfig } from './utils/load-config';


(async () => {
	const argv = cli({
		name: 'link',
		parameters: ['[package paths...]'],
		help: {
			description: 'A better `npm link` - Link a package to the current project',
		},
	});

	const { packagePaths } = argv._;

	if (packagePaths.length > 0) {
		await Promise.all(
			packagePaths.map(
				packagePath => linkPackage(packagePath),
			),
		);
	}

	const config = await loadConfig();

	if (!config) {
		console.warn(`Warning: Config file not found at ${process.cwd()}/link.config.json`);
		return;
	}

	if (!config.packages) {
		return;
	}

	console.log(config);

})().catch((error) => {
	console.error('Error:', error.message);
	process.exit(1);
});
