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

## Terminology

- **Dependency package**

	The package getting linked. This is usually a library.

- **Consuming package**

	The project you want to link the _Dependency package_ as a dependency of. This is usually an application.

	`consuming-package/node_modules/dependency-package` → `dependency-package`


## Usage

### Linking a package

From the _Consuming package_ directory, link the _Dependency package_:

```sh
npx link <dependency-package-path>
```

This creates a symbolic link inside the `node_modules` of _Consuming package_, referencing the _Dependency package_.


> **🛡️ Secure linking**
>
> Unlike `npm link`, it doesn't install the _Dependency package_ globally or re-install project dependencies.

### Publish mode

Using symbolic links may not replicate the exact environment you get from a standard `npm install`. This discrepancy primarily arises from symlinked packages retaining their development `node_modules` directory. This can lead to issues, especially when multiple packages depend on the same library.

<details>
	<summary>Here's an example</summary>
	<br>

In a production environment, `npm install` detects common dependencies and installs only one instance of a shared dependency. However, when there's a symbolic link to the development directory of a dependency, separate copies of those dependencies are resolved from the development `node_modules`.

Let's say there's an _App A_ with a dependency on _Package B_, and they both depend on _Library C_:

- Production environment

	`npm install` detects that both _App A_ and _Package B_ depends on _Library C_, and only installs one copy of _Library C_ for them to share.

- Symbolic link environment

	_App A_ has its copy of _Library C_, and _Package B_ also has its development copy of _Library C_—possibly with different versions. Consequently, when you run the application, it will load two different versions of _Library C_, leading to unexpected outcomes.

</details>

_Publish mode_ helps replicate the production environment in your development setup.

#### Setup instructions

1. In the _Dependency package_, run `npm pack` to create a tarball:

	```sh
	cd dependency-package-path
	npm pack
	```

	This generates a tarball (`.tgz`) file in the current directory. Installing from this simulates the conditions of a published package without actually publishing it.

	> **Tip:** You can skip this step if this dependency is already installed from npm and there are no changes to the dependency's `package.json`

2. In the _Consuming package_

	1. Install the Dependency tarball from _Step 1_

		```sh
		npm install --no-save <dependency-tarball-path>
		```

		This sets up the same `node_modules` tree used in a production environment.

	2. Link the _Dependency package_

		```sh
		npx link publish <dependency-package-path>
		```

		This creates hard links in `node_modules/dependency` to the specific publish assets of the _Dependency package_.

		<details>
		<summary><em>Why hard links instead of symbolic links?</em></summary>
		<br>

		Another issue with the symlink approach is that Node.js, and popular bundlers, looks up the `node_module` directory relative to a module's realpath rather than the import path (symlink path). By using hard links, we can prevent this behavior and ensure that the `node_modules` directory is resolved using the production tree we set up in _Step 2_.
		</details>

4. Start developing!

	Any changes you make to the _Dependency package_ will be reflected in the `node_modules` directory of the _Consuming package_.

	> **Note:** If the _Dependency package_ emits new files, you'll need to re-run `npx link publish <dependency-package-path>` to create new hard links.
	
### Configuration file

Create a `link.config.json` (or `link.config.js`) configuration file at the root of the _Consuming package_ to automatically setup links to multiple _Dependency packages_.

Example _link.config.json_:
```json5
{
    "packages": [
        "/path/to/dependency-path-a",
        "../dependency-path-b"
    ]
}
```

The configuration has the following type schema:
```ts
type LinkConfig = {

    // Whether to run `npx link` on dependency packages with link.config.json
    deepLink?: boolean

    // List of dependency packages to link
    packages?: string[]
}
```

> **Note:** It's not recommended to commit this file to source control since this is for local development with local paths.


To link the dependencies defined in `link.config.json`, run:
```sh
npx link
```

### Deep linking

By default, `npx link` only links packages in the _Consuming package_. However, there are cases where the _Dependency packages_ also needs linking setup.

Deep linking recursively runs link on every linked dependency that has a `link.config.json` file.

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

### Why should I use `npx link` over `npm link`?
Because `npm link` [is complicated and dangerous to use](https://hirok.io/posts/avoid-npm-link). And `npx link` offers more features such as _Publish mode_.

### How do I remove the links?
Run `npm install` and it should remove them.

`npm install` enforces the integrity of `node_modules` by making sure all packages are correctly installed. Reverting the links is a side effect of this.

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
