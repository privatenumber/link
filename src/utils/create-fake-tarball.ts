import tar from 'tar-stream';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { pipeline } from 'node:stream/promises';
import zlib from 'node:zlib';
import type { PackageJson } from '@npmcli/package-json';

export const createFakeTarball = async (
	packagePath: string,
	packageJson: PackageJson,
) => {
	const pack = tar.pack();
	pack.entry(
		{ name: 'package/package.json' },
		JSON.stringify(packageJson),
	);

	// Signal to indicate that this package was made by link for this package
	pack.entry(
		{ name: 'package/..link' },
		packagePath,
	);
	pack.finalize();

	const writeToPath = path.join(os.tmpdir(), Date.now() + '_' + packageJson.name!.replaceAll('/', '_') + '.tgz');

	await pipeline(
		pack,
		zlib.createGzip(),
		fs.createWriteStream(writeToPath),
	);

	return writeToPath;
};
