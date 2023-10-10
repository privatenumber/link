# npx link

A safer and enhanced version of [`npm link`](https://docs.npmjs.com/cli/v8/commands/npm-link).

Why is `npm link` unsafe? Read the [blog post](https://hirok.io/posts/avoid-npm-link).

### Features
- 🔗 Link dependencies without removing previous links
- 🛡 Only resolves to local paths
- 🔥 Config file quickly linking multiple packages
- 💫 Deep linking for quickling linking multilple packages

<br>

<p align="center">
	<a href="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=platinum">
		<picture>
			<source width="830" media="(prefers-color-scheme: dark)" srcset="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=platinum&image=dark">
			<source width="830" media="(prefers-color-scheme: light)" srcset="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=platinum&image">
			<img width="830" src="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=platinum&image" alt="Premium sponsor banner">
		</picture>
	</a>
</p>

## Usage

### Symlinking a package
`npx link`  symlinks the target package as a dependency in the current project.

From the project directory you want to link a package to:

```sh
npx link <package-path>
```

> **Secure linking**
>
> Unlike `npm link`, it doesn't install the target package globally or re-install project dependencies.

### Publish mode

Symlinking doesn't replicate the exact environment you get from installing a package using `npm install`. So sometimes, creating a symlink to the package directory isn't sufficient.

#### Why?
The discrepancy in the environments mainly come from the symlinked package retaining its development `node_modules` directory.

Consider an example where there's an _App A_ with a dependency on _Package B_ , and they both depend on _Library C_:

- Production environment

	`npm install` recognizes that both _App A_ and _Package B_ require library C and installs only one instance of _Library C_ for them to share.

- Symlinked environment

	_App A_ will have its copy of _Library C_, and _Package B_ will also have its development copy of _Library C_—possibly with different versions. Consequently, when you run the application, it will load two different versions of _Library C_, leading to unexpected outcomes.

To replicate the production environment in development, you can use _Publish mode_.

#### Setup
1. Pack the target project

	In the package you want to link, run [`npm pack`](https://docs.npmjs.com/cli/v7/commands/npm-pack) to create a tarball:

	```sh
	cd target-package-path
	npm pack
	```

	This creates a `.tgz` file in the current directory.

	<details>
	<summary><em>What does this do?</em></summary>
	<br>

	When you publish a package using `npm publish`, it runs `npm pack` to create a tarball and then publishes it to the registry.

	However, if you only run `npm pack`, it generates the tarball without actually publishing it. You can install directly from this tarball to replicate the conditions of a published package.
	</details>

2. Install the target project

	In the project you want to link the package to, install the tarball from _Step 1_:
	```sh
	npm install --no-save <tarball-path>
	```

3. Link the target project

	```sh
	npx link publish <package-path>
	```

	In publish mode, `npx link` will create hard links to the specific publish assets of the target package. By doing this, the `node_modules` directory will be identical to the one you get from installing the package from the registry.

	<details>
	<summary><em>Why hardlinks?</em></summary>
	<br>

	One other problem with the symlink approach is that Node.js looks up the `node_module` directory relative to the module's realpath, rather than the import path (aka symlink path).

	</details>


### Configuration file

Create a `link.config.json` (or `link.config.js`) configuration file at the root of your npm project to automatically setup links to multiple packages.

Example _link.config.json_:
```json5
{
    "packages": [
        "/path/to/package-path-a",
        "../package-path-b"
    ]
}
```

The configuration has the following type schema:
```ts
type LinkConfig = {

    // Whether to run link on linked packages with link.config.json
    deepLink?: boolean

    // List of packages to link
    packages?: string[]
}
```

> Note: It's not recommended to commit this file to source control since this is for local development with local paths.


To link the dependencies defined in `link.config.json`, run:
```sh
npx link
```

### Deep linking

By default, `npx link` only links packages in the current project. However, there are cases where the linked packages also needs linking setup.

Deep linking recursively runs link on every linked package that has a `link.config.json` file.

Enable with the `--deep` flag or `deepLink` property in `link.config.json`.

```sh
npx link --deep
```

<br>

<p align="center">
	<a href="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=gold">
		<picture>
			<source width="830" media="(prefers-color-scheme: dark)" srcset="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=gold&image=dark">
			<source width="830" media="(prefers-color-scheme: light)" srcset="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=gold&image">
			<img width="830" src="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=gold&image" alt="Premium sponsor banner">
		</picture>
	</a>
</p>

## FAQ

### Why should I use this over `npm link`?
Because `npm link` has [footguns that make it dangerous to use](https://hirok.io/posts/avoid-npm-link).

### How do I remove the symlinks?
Run `npm install` (or the equivalent in your preferred package manager) and it should remove them.

### Why does `npx link` point to `ln`?

You must use npx v7 or higher. Check the version with `npx -v`.

In the obsolete npx v6, local binaries take precedence over npm modules so  `npx link` can point to the native `link`/`ln` command:
```
$ npx link
usage: ln [-s [-F] | -L | -P] [-f | -i] [-hnv] source_file [target_file]
       ln [-s [-F] | -L | -P] [-f | -i] [-hnv] source_file ... target_dir
       link source_file target_file
```

To work around this, install `link` globally first:
```sh
$ npm i -g link
$ npx link
```

## Related

- [`npx ci`](https://github.com/privatenumber/ci) - A better `npm ci`.


## Sponsors

<p align="center">
	<a href="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=silver1">
		<picture>
			<source width="410" media="(prefers-color-scheme: dark)" srcset="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=silver1&image=dark">
			<source width="410" media="(prefers-color-scheme: light)" srcset="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=silver1&image">
			<img width="410" src="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=silver1&image" alt="Premium sponsor banner">
		</picture>
	</a>
	<a href="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=silver2">
		<picture>
			<source width="410" media="(prefers-color-scheme: dark)" srcset="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=silver2&image=dark">
			<source width="410" media="(prefers-color-scheme: light)" srcset="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=silver2&image">
			<img width="410" src="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=silver2&image" alt="Premium sponsor banner">
		</picture>
	</a>
</p>

<p align="center">
	<a href="https://github.com/sponsors/privatenumber">
		<img src="https://cdn.jsdelivr.net/gh/privatenumber/sponsors/sponsorkit/sponsors.svg">
	</a>
</p>
