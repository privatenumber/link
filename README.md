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

## Related

- [`npx ci`](https://github.com/privatenumber/ci) - A better `npm ci`.