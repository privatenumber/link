import path from 'path';
import { execaNode } from 'execa';

const linkBinPath = path.resolve('./dist/cli.js');

type Options = {
	cwd: string;
	nodePath: string;
};

export const link = async (
	cliArguments: string[],
	{
		cwd,
		nodePath,
	}: Options,
) => await execaNode(
	linkBinPath,
	cliArguments,
	{
		env: {},
		extendEnv: false,
		nodeOptions: [],
		cwd,
		nodePath,
	},
).catch(error => error);
