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

In `metro.config.js`, `nodeModulesPaths` lists `apps/mobile/node_modules` first, and
`resolver.extraNodeModules` explicitly pins `react` + `react-native` to the mobile copy —
so the bundler always resolves React 19 from `apps/mobile/node_modules`, not the root.

> **Do NOT set `disableHierarchicalLookup: true`.** It was tried and broke the bundle:
> Expo installs some transitive deps nested (e.g. `expo` → `expo-asset` under
> `apps/mobile/node_modules/expo/node_modules/`), and disabling hierarchical lookup makes
> Metro unable to resolve them. Hierarchical lookup must stay ENABLED; the `extraNodeModules`
> pin above is what guarantees the single React, not the lookup flag.

Running `npm dedupe` would collapse the two React installs into one and break the mobile
bundler at runtime. Do not run it. If you must tidy the lock file, run
`npm install --prefer-dedupe` and immediately verify with:

```bash
cat apps/mobile/node_modules/react/package.json | grep '"version"'   # must be 19.x
cat node_modules/react/package.json | grep '"version"'               # must be 18.x
```
