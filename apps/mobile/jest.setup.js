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
    withRepeat: (v) => v,
    withSequence: (...vs) => vs[vs.length - 1],
    cancelAnimation: () => {},
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

// react-native-view-shot wraps a native module (it snapshots the real view
// hierarchy) that does not exist under jest. Feedback capture is exercised by
// passing a uri through the screen's route params instead; this mock just keeps
// the import resolvable. A REAL capture can only be verified on a device.
jest.mock('react-native-view-shot', () => ({
  __esModule: true,
  captureScreen: jest.fn(async () => 'file:///tmp/mock-capture.jpg'),
  captureRef: jest.fn(async () => 'file:///tmp/mock-capture.jpg'),
}));

// @sentry/react-native wraps the RNSentry native module, which does not exist
// under jest — importing the real SDK would nag about the missing native layer and
// try to stand up a transport. Mocked to plain spies so tests can assert the JS
// call path (init options, captureException) without any network or native part.
//
// IMPORTANT: this mock is why the suite can only ever prove that events are
// HANDED to the SDK. It cannot prove they are transmitted. Real delivery has to
// be observed from a release build on a physical device (see src/lib/telemetry.ts).
jest.mock('@sentry/react-native', () => ({
  __esModule: true,
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  wrap: jest.fn((c) => c),
}));

// @react-native-google-signin/google-signin wraps a native module absent in jest,
// and GoogleSignInButton calls GoogleSignin.configure() at module load. Default the
// mock to a "cancelled" sign-in so screen tests that merely render the button stay
// inert; the dedicated GoogleSignInButton test overrides signIn/isSuccessResponse.
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn().mockResolvedValue({ type: 'cancelled', data: null }),
  },
  isSuccessResponse: jest.fn((r) => r?.type === 'success'),
  isErrorWithCode: jest.fn(() => false),
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED', IN_PROGRESS: 'IN_PROGRESS', PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE', DEVELOPER_ERROR: 'DEVELOPER_ERROR' },
}));

// @react-native-community/datetimepicker wraps a native module that is absent in
// jest. The mock lives at __mocks__/@react-native-community/datetimepicker.js
// (auto-discovered by Jest's manual mock resolution) so NativeWind's babel plugin
// does not inject _ReactNativeCSSInterop into the factory — placing jest.mock()
// inside jest.setup.js causes that injection and a "variable out of scope" error.

// `expo-splash-screen` touches the native module on import; the root layout uses it
// to hold the brand until the font loads.
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

// `expo-status-bar` reaches for the native module on import; the theme provider
// renders it so every mounted test would hit it.
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
