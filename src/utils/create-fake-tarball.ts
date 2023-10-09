import tar from 'tar-stream';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { readPackageJson } from './read-package-json';
import { pipeline } from 'node:stream/promises';
import zlib from 'node:zlib';

export const createFakeTarball = async (
	packagePath: string,
) => {
	const packageJson = await readPackageJson(packagePath);
	const pack = tar.pack();
	pack.entry(
		{ name: 'package/package.json' },
		JSON.stringify(packageJson),
	);
	pack.entry(
		{ name: 'package/..link' },
		packagePath,
	);
	pack.finalize();

	const packageName = path.basename(packagePath);
	const writeToPath = path.join(os.tmpdir(), Date.now() + '_' + packageName + '.tgz');

	await pipeline(
		pack,
		zlib.createGzip(),
		fs.createWriteStream(writeToPath),
	);

	return writeToPath;
};
