import path from 'path';
import fs from 'fs';
import { execaNode } from 'execa';

console.log('cwd', process.cwd());
console.log('contents', fs.readdirSync(process.cwd()));

const linkBinPath = path.resolve('./dist/cli.js');

console.log('cwd', linkBinPath);
console.log('contents', fs.readdirSync(path.dirname(linkBinPath)));

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
