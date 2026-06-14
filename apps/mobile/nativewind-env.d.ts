/// <reference types="nativewind/types" />
/// <reference types="react-native-css-interop/types" />

// Allow CSS files to be imported as side-effects (e.g. `import './global.css'`).
// NativeWind processes them at bundle time; TypeScript just needs to acknowledge them.
declare module '*.css' {}
