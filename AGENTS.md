# Maple Agent Guide

## Project

Maple is a browser extension project for bookmark navigation.

## Repository Map

- `bookmark/` - main bookmarks extension.
- `newtab/` - new tab page.
- `theme/` - Chrome theme package.
- `tests/` - Node test suite.
- `package.json` - build, lint and test scripts.
- `package-lock.json` and `yarn.lock` - existing lockfiles; use `npm` commands unless the maintainer asks otherwise.

## Commands

```bash
npm install
npm run lint
npm test
npm run build
```

`npm run build` creates zip packages in `dist/`.
`npm run lint` runs `eslint . --fix`, so inspect the resulting diff after using it.

## Working Rules

- Preserve each extension `manifest.json` shape and permissions.
- Keep browser-specific changes scoped to the matching package.
- Do not commit generated `dist/` archives.
- Prefer small, targeted fixes over broad rewrites.

## Verification

- JavaScript or manifest changes: run `npm run lint`, `npm test` and `npm run build`.
- Lint-only changes: because lint auto-fixes, re-read the modified files before summarizing.
- Extension behavior changes: load the built extension in Chrome or Firefox and confirm the target flow.
- Documentation-only changes: check links and commands for accuracy.

## GitHub Operations

- Use `gh` for issues and PRs. Comment, merge, close, or label only when the current task authorizes it, and write public replies in the thread's language.
