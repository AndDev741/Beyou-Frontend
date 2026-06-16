const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Monorepo watchFolders: include entire workspace root so Metro sees all packages
config.watchFolders = [workspaceRoot];

// Resolve modules: mobile's own node_modules first (React 19), then workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Hierarchical lookup stays ENABLED so Metro can resolve a package's NESTED
// transitive deps (e.g. `expo` requires `expo-asset`, which npm installs under
// `apps/mobile/node_modules/expo/node_modules/expo-asset` in this workspace).
// Disabling it broke that resolution. Dual-React (mobile=19, root=18) is still
// guaranteed by `nodeModulesPaths` (mobile first) PLUS the explicit pin below.
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
};

// ---------------------------------------------------------------------------
// Force a SINGLE instance of NativeWind's native-singleton transitive deps.
//
// `nativewind` is hoisted to the repo ROOT, and npm nests NativeWind's OWN copies
// of these packages under `node_modules/nativewind/node_modules/` at NEWER versions
// than the app declares (e.g. reanimated 4.4.1 / worklets 0.9.2). Because Metro's
// hierarchical lookup finds the nested copy first, NativeWind's css-interop would run
// reanimated 4.4.1 while Expo Go (SDK 56) bundles NATIVE reanimated 4.3.1 — the
// reanimated JS<->native version guard then throws, css-interop's style application
// fails, and EVERY `className` renders unstyled (the whole UI looks like raw HTML).
//
// `extraNodeModules` can't fix this: it is only a fallback consulted AFTER a nested
// physical copy is found. So we redirect resolution explicitly. Targets must match
// Expo SDK 56's bundledNativeModules (reanimated 4.3.1, worklets 0.8.3) and the root
// package.json `overrides` (which apply on a clean lockfile regen).
const SINGLETONS = {
  'react-native-reanimated': path.resolve(projectRoot, 'node_modules/react-native-reanimated'),
  'react-native-worklets': path.resolve(projectRoot, 'node_modules/react-native-worklets'),
  'react-native-css-interop': path.resolve(projectRoot, 'node_modules/react-native-css-interop'),
};

const finalConfig = withNativeWind(config, { input: './global.css' });

// Apply AFTER withNativeWind so we delegate to (and don't clobber) NativeWind's own
// resolver. Chain to the previous resolveRequest if present, else Metro's default.
const baseResolveRequest = finalConfig.resolver.resolveRequest;
finalConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  const next = baseResolveRequest ?? context.resolveRequest;
  for (const [name, dir] of Object.entries(SINGLETONS)) {
    if (moduleName === name || moduleName.startsWith(name + '/')) {
      const redirected = dir + moduleName.slice(name.length);
      return next(context, redirected, platform);
    }
  }
  return next(context, moduleName, platform);
};

module.exports = finalConfig;
