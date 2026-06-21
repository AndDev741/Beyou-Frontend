// jest-expo (React 19) does not configure the React "act" testing environment.
// Without this flag React does not serialize act() scopes, so async state updates
// from one test (e.g. an awaited redux thunk re-rendering after the assertion
// resolves) can overlap into the next test and corrupt its render
// ("overlapping act() calls"). Enabling it makes @testing-library/react-native's
// async helpers (waitFor) flush updates inside a single act scope. This is the
// React-recommended setting for any RTL-based test environment.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// react-native-reanimated v4 throws at import in jest ("Native part of Worklets
// doesn't seem to be initialized") — and even its bundled /mock re-imports the
// real module, which re-triggers the worklets init. So we hand-roll a
// self-contained mock (no real reanimated require) covering only the APIs our
// components use, with no-op animations. NativeWind uses reanimated lazily for
// static className styling, so passthrough Animated.View is sufficient.
jest.mock('react-native-reanimated', () => {
  const { View, Text, ScrollView } = require('react-native');
  const entering = { duration: () => entering, delay: () => entering, springify: () => entering };
  return {
    __esModule: true,
    default: { View, Text, ScrollView, createAnimatedComponent: (c) => c },
    View,
    Text,
    ScrollView,
    useSharedValue: (v) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withTiming: (v) => v,
    withSpring: (v) => v,
    withDelay: (_d, v) => v,
    useReducedMotion: () => false,
    Easing: new Proxy({}, { get: () => (x) => x }),
    FadeInDown: entering,
    FadeIn: entering,
    FadeOut: entering,
  };
});

// lucide-react-native ships ~1754 icon modules + pulls react-native-svg; mocking
// it keeps icon tests fast and avoids transforming the whole pack. Any icon name
// (PascalCase) resolves to a no-op component; BeyouIcon's emoji/fallback branches
// are what the tests assert.
jest.mock('lucide-react-native', () =>
  new Proxy(
    {},
    { get: (_t, prop) => (prop === '__esModule' ? true : () => null) },
  ),
);

// @react-native-community/datetimepicker wraps a native module that is absent in
// jest. The mock lives at __mocks__/@react-native-community/datetimepicker.js
// (auto-discovered by Jest's manual mock resolution) so NativeWind's babel plugin
// does not inject _ReactNativeCSSInterop into the factory — placing jest.mock()
// inside jest.setup.js causes that injection and a "variable out of scope" error.
