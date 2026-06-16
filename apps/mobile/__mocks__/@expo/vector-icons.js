// Manual mock for @expo/vector-icons (auto-applied by jest for node_modules).
//
// The real package pulls in expo-font -> expo-asset, which Expo installs nested
// under apps/mobile/node_modules/expo/node_modules/ (see AGENTS.md). Jest cannot
// resolve that transitive dependency, so importing any icon set crashes the test
// runner. Icons are decorative — replace every icon set with react-native's View
// so any screen that renders icons (login, register, ...) mounts cleanly.
const { View } = require('react-native');

module.exports = new Proxy(
  {},
  {
    get: () => View,
  },
);
