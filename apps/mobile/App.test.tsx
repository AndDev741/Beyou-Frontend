/**
 * Wiring smoke test: App renders LoginScreen when bootstrap finds no stored token.
 *
 * Jest-expo runs in a jsdom-like env. This workspace carries dual React:
 *   apps/mobile → React 19.x
 *   root / apps/web → React 18.x
 *
 * react-redux and react-i18next are hoisted to the root (React 18), so any hook
 * they call sees a different React dispatcher than what the mobile renderer uses.
 * This triggers the "Invalid hook call — multiple React copies" error.
 *
 * The fix: mock both libraries at the hooks layer.  We then test that the
 * auth-status gate in Root() correctly shows LoginScreen (testID assertions)
 * when status is 'unauthenticated'.
 */

// Stub expo-secure-store: getItemAsync returns null → bootstrap finds no token
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Stub fetch — no real network I/O
global.fetch = jest.fn().mockResolvedValue({
  ok: false,
  status: 401,
  headers: { forEach: jest.fn() },
  json: jest.fn().mockResolvedValue({}),
}) as unknown as typeof fetch;

// Stub expo-localization (unavailable in jest env)
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

// Stub react-redux to avoid dual-React invalid-hook-call.
// Provider is transparent; hooks return stable predictable values.
jest.mock('react-redux', () => {
  const React = require('react');
  return {
    Provider: ({ children }: { children: React.ReactNode }) => children,
    useSelector: (selector: (s: unknown) => unknown) =>
      selector({
        auth: { status: 'unauthenticated', profile: null, error: null, needsVerification: false },
      }),
    useDispatch: () => () => undefined,
  };
});

// Stub react-i18next to avoid dual-React hook call through root React.
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) return `${key}:${JSON.stringify(params)}`;
      return key;
    },
    i18n: { language: 'en' },
  }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

// Stub nativeHttpClient so module-level App.tsx wiring does not throw
jest.mock('./src/lib/nativeHttpClient', () => ({
  nativeHttpClient: {},
  setAccessToken: jest.fn(),
  setRefreshHandler: jest.fn(),
  setOnUnauthenticated: jest.fn(),
}));

import { render, screen } from '@testing-library/react-native';
import App from './App';

test('LoginScreen renders when auth status is unauthenticated', async () => {
  // render() is async in @testing-library/react-native v14
  await render(<App />);
  // screen.findByTestId retries until the element appears or times out
  await screen.findByTestId('login-email-input');
  await screen.findByTestId('login-submit-button');
});
