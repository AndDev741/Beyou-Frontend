/**
 * Integration smoke test: App renders LoginScreen when bootstrap finds no stored token.
 *
 * Jest resolves a SINGLE React copy (mobile React 19) via moduleNameMapper in
 * package.json ("^react$" → "<rootDir>/node_modules/react"). This means
 * react-redux and react-i18next hooks share the same React dispatcher as the
 * renderer — no "Invalid hook call / multiple React copies" error.
 *
 * What this test does NOT mock (real wiring exercised):
 *   - react-redux (real Provider + store + useSelector/useDispatch)
 *   - react-i18next (real i18n initialized from './src/i18n')
 *
 * What it DOES mock (infrastructure unavailable in the jest env):
 *   - expo-secure-store: getItemAsync → null  (no token → bootstrap → unauthenticated)
 *   - expo-localization: getLocales → [{languageCode:'en'}]
 *   - global.fetch: silent stub (no real network)
 *   - ./src/lib/nativeHttpClient: module-level singleton wired at import time in App.tsx
 */

// 1. expo-secure-store: no token stored → bootstrap resolves unauthenticated
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// 2. expo-localization: unavailable in jest env
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

// 3. global.fetch: silence network I/O
global.fetch = jest.fn().mockResolvedValue({
  ok: false,
  status: 401,
  headers: { forEach: jest.fn() },
  json: jest.fn().mockResolvedValue({}),
}) as unknown as typeof fetch;

// 4. nativeHttpClient: module-level side effects in App.tsx call setRefreshHandler /
//    setOnUnauthenticated at import time; stub the singleton so @beyou/api does not
//    need a real HTTP client wired during the test.
jest.mock('./src/lib/nativeHttpClient', () => ({
  nativeHttpClient: {},
  setAccessToken: jest.fn(),
  setRefreshHandler: jest.fn(),
  setOnUnauthenticated: jest.fn(),
}));

import { render } from '@testing-library/react-native';
import App from './App';

test('LoginScreen renders when bootstrap finds no stored token', async () => {
  // TTRN v14: render() is async — must be awaited to get the query helpers.
  // The real bootstrap() thunk dispatches setStatus('loading') then
  // setStatus('unauthenticated') after secureStore.getRefreshToken() resolves null.
  // The real Provider + store + i18n wire are all exercised here.
  const { findByTestId } = await render(<App />);
  await findByTestId('login-email-input');
  await findByTestId('login-submit-button');
});
