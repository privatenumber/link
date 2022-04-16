import { cli } from 'cleye';
import { linkPackage } from './link-package';

(async () => {
	const argv = cli({
		name: 'link',
		parameters: ['<package path>'],
		help: {
			description: 'A better `npm link` - Link a package to the current project',
		},
	});

	const { packagePath } = argv._;
	await linkPackage(packagePath);
})().catch((error) => {
	console.error('Error:', error.message);
	process.exit(1);
});
