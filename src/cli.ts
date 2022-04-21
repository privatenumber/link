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

		return;
	}

	const config = await loadConfig();

	if (!config) {
		console.warn(`Warning: Config file "link.config.json" not found in current directory.`);
		// console.log('');
		// console.log('Did you mean to run `npm link` instead? Check out npx link as a safer alternative!');
		return;
	}

	if (!config.packages) {
		return;
	}

	await Promise.all(
		config.packages.map(
			async (linkPath) => await linkPackage(linkPath)
		),
	);
})().catch((error) => {
	console.error('Error:', error.message);
	process.exit(1);
});
