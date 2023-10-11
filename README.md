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

> **🛡️ Secure linking**
>
> Unlike `npm link`, it doesn't install the target package globally or re-install project dependencies.

### Publish Mode

Symlinking doesn't always replicate the exact environment you get from a standard `npm install`. This discrepancy primarily arises from symlinked packages retaining their development `node_modules` directory. This can lead to issues, especially when multiple packages depend on the same library. To address this, you can use _Publish mode_.

#### Why use Publish Mode?

In a production environment, `npm install` detects common dependencies and installs only one instance of a shared dependency. However, in a symlinked environment, the symlinked package pulls in its own copy from development.

Consider an example where there's an _App A_ with a dependency on _Package B_, and they both depend on _Library C_:

- Production environment

	`npm install` detects that both _App A_ and _Package B_ depends on _Library C_ and installs one copy of _Library C_ for them to share.

- Symlinked environment

	_App A_ has its copy of _Library C_, and _Package B_ also has its development copy of _Library C_—possibly with different versions. Consequently, when you run the application, it will load two different versions of _Library C_, leading to unexpected outcomes.

Publish mode helps replicate the production environment in your development setup.

#### Setup

To use Publish mode, follow these steps:

1. Pack the target project

	Navigate to the directory of package you want to link and run `npm pack` to create a tarball:

	```sh
	cd target-package-path
	npm pack
	```

	This generates a tarball (`.tgz`) file in the current directory. Installing from this simulates the conditions of a published package without actually publishing it.


2. Install the tarball

	In the current project, install the tarball created in _Step 1_. Replace `<target-tarball-path>` with the path to the tarball:

	```sh
	npm install --no-save <target-tarball-path>
	```

	This allows npm (or the package manager of your choice) to set up the same `node_modules` tree used in a production environment.

3. Link the target project

	In the current project, link the target package in publish mode:

	```sh
	npx link publish <target-package-path>
	```

	This creates hard links in `node_modules` to the specific publish assets of the target package.

	<details>
	<summary><em>Why hard links?</em></summary>
	<br>

	Another issue with the symlink approach is that Node.js, and popular bundlers, looks up the `node_module` directory relative to a module's realpath rather than the import path (symlink path). By using hard links, we can prevent this behavior and ensure that the `node_modules` directory is resolved using the production tree we set up in _Step 2_.
	</details>

4. Start developing and make changes to the target project

	Now that you've linked the target project, you can start developing. Any changes you make to the target project will be reflected in the linked project.

	> **Note:** If the target project emits new files, you'll need to re-run `npx link publish <target-package-path>` to re-create the hard links.
	
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
