# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Dual-React setup — do not run `npm dedupe`

This workspace intentionally ships two React versions side-by-side:

- **`apps/mobile`** — React 19.2.3 + react-native 0.85.3 (Expo SDK 56 requirement)
- **root / `apps/web`** — React 18.3.1

The root `package.json` carries an `overrides` block that pins `@beyou/mobile`'s `react`
and `react-native` to their required versions so npm never hoists them out of
`apps/mobile/node_modules`:

```json
"overrides": {
  "@beyou/mobile": {
    "react": "19.2.3",
    "react-native": "0.85.3"
  }
}
```

Metro's `nodeModulesPaths` in `metro.config.js` (`disableHierarchicalLookup: true`) then
ensures the bundler always resolves React from `apps/mobile/node_modules`, not from the
workspace root.

Running `npm dedupe` would collapse the two React installs into one and break the mobile
bundler at runtime. Do not run it. If you must tidy the lock file, run
`npm install --prefer-dedupe` and immediately verify with:

```bash
cat apps/mobile/node_modules/react/package.json | grep '"version"'   # must be 19.x
cat node_modules/react/package.json | grep '"version"'               # must be 18.x
```
