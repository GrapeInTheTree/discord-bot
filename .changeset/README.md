# Changesets

This folder is used by [changesets](https://github.com/changesets/changesets) to track version bumps and changelogs across the monorepo.

## Adding a changeset

When you make a change worth noting in the changelog, run:

```bash
pnpm changeset
```

The CLI will prompt you for:

1. Which packages changed (use space to select)
2. The bump type (`patch` / `minor` / `major`)
3. A short summary of the change

A new markdown file is created in this folder. **Commit it with your PR.**

## Releasing

On `main` push, GitHub Actions opens a "Version Packages" PR that consolidates all pending changesets. Merging that PR bumps versions and (if not private) publishes packages.

For this monorepo, all packages are private — releases are docker image rebuilds, not npm publishes.
