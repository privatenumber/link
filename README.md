# npx link

A safer version of [`npm link`](https://docs.npmjs.com/cli/v8/commands/npm-link).

## Usage

`npx link` simply symlinks the target package as a dependency in the current project.

Unlike `npm link`, it doesn't install the target package globally or re-install project dependencies.

From the project you want to link a package to:

```sh
npx link <package-path>
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
