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

module.exports = withNativeWind(config, { input: './global.css' });
