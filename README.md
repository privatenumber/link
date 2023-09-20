# npx link

A safer version of [`npm link`](https://docs.npmjs.com/cli/v8/commands/npm-link).

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

`npx link` simply symlinks the target package as a dependency in the current project.

Unlike `npm link`, it doesn't install the target package globally or re-install project dependencies.

From the project you want to link a package to:

```sh
npx link <package-path>
```

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
