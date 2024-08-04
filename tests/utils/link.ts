import path from 'path';
import { execaNode } from 'execa';

const linkBinPath = path.resolve('./dist/cli.js');

type Options = {
	cwd: string;
	nodePath: string;
};

export const link = (
	cliArguments: string[],
	{
		cwd,
		nodePath,
	}: Options,
) => execaNode(
	linkBinPath,
	cliArguments,
	{
		env: {},
		extendEnv: false,
		nodeOptions: [],
		cwd,
		nodePath,
		reject: false,
	},
);
