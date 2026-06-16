module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // react-native-reanimated 4.x (its plugin re-exports react-native-worklets/plugin)
    // MUST be the LAST plugin — reanimated needs it to transform worklets, and
    // NativeWind v4's css-interop runs on reanimated. (Note: this plugin alone does
    // NOT make className styles apply. The unstyled-UI bug was a DUPLICATE, version-
    // mismatched reanimated being pulled through the hoisted `nativewind`; the real
    // fix lives in metro.config.js — see the SINGLETONS redirect there.)
    plugins: ['react-native-reanimated/plugin'],
  };
};
