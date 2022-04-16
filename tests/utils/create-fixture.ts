import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const temporaryDirectory = path.join(os.tmpdir(), 'link');

class Fixture {
	path: string;

	constructor(fixturePath: string) {
		this.path = fixturePath;
	}

	async createFrom(templatePath: string) {
		if (await this.exists()) {
			await this.rm();
		}

		await fs.mkdir(this.path, { recursive: true });

		await fs.cp(
			templatePath,
			this.path,
			{
				recursive: true,
				filter: source => !path.basename(source).startsWith('.'),
			},
		);
	}

	exists(
		subpath?: string,
	) {
		const checkPath = subpath ? path.join(this.path, subpath) : this.path;
		return fs.access(checkPath).then(() => true, () => false);
	}

	rm(
		subpath?: string,
	) {
		const rmPath = subpath ? path.join(this.path, subpath) : this.path;
		return fs.rm(rmPath, {
			recursive: true,
			force: true,
		});
	}

	writeFile(filePath: string, content: string) {
		return fs.writeFile(
			path.join(this.path, filePath),
			content,
		);
	}

	writeJson(filePath: string, json: any) {
		return this.writeFile(
			filePath,
			JSON.stringify(json, null, 2),
		);
	}
}

let id = 1;

export async function createFixture(
	fromFixtureTemplatePath: string,
) {
	const fixturePath = path.resolve(
		temporaryDirectory,
		`${path.basename(fromFixtureTemplatePath)}-${id}`,
	);

	id += 1;

	const fixture = new Fixture(fixturePath);

	await fixture.createFrom(fromFixtureTemplatePath);

	return fixture;
}
