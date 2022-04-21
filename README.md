# npx link

A safer version of [`npm link`](https://docs.npmjs.com/cli/v8/commands/npm-link).

## Usage

`npx link` simply symlinks the target package as a dependency in the current project.

Unlike `npm link`, it doesn't install the target package globally or re-install project dependencies.

From the project you want to link a package to:

```sh
npx link <package-path>
```

### Configuration file

Create a `link.config.json` configuration file at the root of your npm project to automatically setup links to multiple packages.

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

    // List of packages to link
    packages?: string[]
}
```

> Note: It's not recommended to commit this file to source control since this is for local development with local paths.


To link the dependencies defined in `link.config.json`, run:
```sh
npx link
```

## FAQ

### Why should I use this over `npm link`?
Because `npm link` has foot guns that make it dangerous to use.

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
