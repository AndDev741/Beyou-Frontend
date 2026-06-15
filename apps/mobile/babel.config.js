module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // react-native-reanimated 4.x (its plugin re-exports react-native-worklets/plugin)
    // MUST be the LAST plugin. NativeWind v4's css-interop uses reanimated; without
    // this, reanimated throws at init and NO className styles apply (fully unstyled).
    plugins: ['react-native-reanimated/plugin'],
  };
};
