---
name: link
description: "Symlink or hardlink local packages into node_modules using `npx link`. Use when linking local dependencies for development, setting up publish-mode hardlinks, or configuring link.config.json. Do not use for general symlink/hardlink filesystem questions or npm link internals."
---

# npx link

Safer `npm link` alternative — symlinks local packages directly into `node_modules` without global installs or dependency reinstalls.

## Commands

| Command | Purpose |
|---------|---------|
| `npx link <paths...>` | Symlink local packages into `node_modules` |
| `npx link` | Link all packages from `link.config.json` |
| `npx link --deep` / `-d` | Recursively link dependencies that have their own `link.config.json` |
| `npx link publish <paths...>` | Hardlink only publishable files (simulates `npm install`) |

## Symlink Mode (Default)

Creates a symlink at `node_modules/<package-name>` pointing to the local package directory. Also symlinks binaries into `node_modules/.bin/`.

```sh
# From the consuming project directory
npx link ../my-library
```

Removes links by running `npm install` (restores `node_modules` integrity).

### When to use symlink mode
- Quick iteration on a local dependency
- The dependency has no shared sub-dependencies that cause duplication issues

## Publish Mode

Hardlinks only the files that `npm publish` would include (respects `files` field, `.npmignore`). Avoids the duplicate `node_modules` problem that symlinks cause.

### Setup

```sh
# 1. In the dependency package — create a tarball
cd ../my-library
npm pack

# 2. In the consuming project — install tarball, then link
npm install --no-save ../my-library/my-library-1.0.0.tgz
npx link publish ../my-library
```

### When to use publish mode
- Dependency shares sub-dependencies with the consuming project (e.g., React, Vue)
- Testing the exact publish output before releasing
- Bundlers or Node.js resolve modules via realpath (symlinks break resolution)

### Limitations
- New files in the dependency require re-running `npx link publish <path>`
- The dependency must already be installed (via tarball) before linking

## Configuration File

`link.config.json` (or `link.config.js`) at the consuming project root:

```json
{
    "packages": [
        "../dependency-a",
        "/absolute/path/to/dependency-b"
    ],
    "deepLink": false
}
```

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `packages` | `string[]` | — | Paths to dependency packages (absolute or relative) |
| `deepLink` | `boolean` | `false` | Recursively link dependencies that have their own `link.config.json` |

Do not commit `link.config.json` — paths are machine-specific.

Run `npx link` with no arguments to link all configured packages. Use `npx link --deep` or set `"deepLink": true` to enable recursive linking.

## Symlink vs Publish Mode

| Concern | Symlink mode | Publish mode |
|---------|-------------|-------------|
| Speed | Instant | Requires initial `npm pack` + install |
| Shared dependencies | May duplicate (two `node_modules` trees) | Production-accurate (single tree) |
| File scope | Entire package directory | Only publishable files |
| Link type | Symbolic link | Hard link |
| Realpath resolution | Points to source directory | Points to `node_modules` copy |
| New file detection | Automatic | Requires re-run |
