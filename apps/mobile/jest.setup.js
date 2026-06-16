// jest-expo (React 19) does not configure the React "act" testing environment.
// Without this flag React does not serialize act() scopes, so async state updates
// from one test (e.g. an awaited redux thunk re-rendering after the assertion
// resolves) can overlap into the next test and corrupt its render
// ("overlapping act() calls"). Enabling it makes @testing-library/react-native's
// async helpers (waitFor) flush updates inside a single act scope. This is the
// React-recommended setting for any RTL-based test environment.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
