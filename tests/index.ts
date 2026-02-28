import { describe } from 'manten';
import getNode from 'get-node';
import { cli } from './specs/cli.spec.js';
import { linkConfig } from './specs/link-config.spec.js';
import { publish } from './specs/publish.spec.js';
import { symlinkSpec } from './specs/symlink.spec.js';
import { utils } from './specs/utils.spec.js';

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
		await describe(`Node ${node.version}`, () => {
			cli(node.path);
			linkConfig(node.path);
			publish(node.path);
			symlinkSpec(node.path);
			utils(node.path);
		});
	}
})();
