import { describe, setProcessTimeout } from 'manten';
import getNode from 'get-node';

// Kill process if tests don't complete in 2 minutes
setProcessTimeout(2 * 60 * 1000);

const nodeVersions = [
	'20',
	...(
		process.env.CI
			? [
				'18',
			]
			: []
	),
];

(async () => {
	for (const nodeVersion of nodeVersions) {
		const node = await getNode(nodeVersion);
		await describe(`Node ${node.version}`, ({ runTestSuite }) => {
			runTestSuite(import('./specs/cli.spec'), node.path);
			runTestSuite(import('./specs/link-config.spec'), node.path);
			runTestSuite(import('./specs/publish.spec'), node.path);
			runTestSuite(import('./specs/symlink.spec'), node.path);
			runTestSuite(import('./specs/utils.spec'), node.path);
		});
	}
})();
