/**
 * ErrorBoundary — renders children normally; on a child render crash it swaps to a
 * recoverable fallback (translated message + retry) instead of a white screen.
 */
jest.mock('expo-router', () => ({
  // The real module's focus hook: screens use it to refresh on the way back.
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(() => callback(), [callback]),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false }),
  useLocalSearchParams: () => ({}),
}));

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { setHttpClient, setLogger } from '@beyou/api';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import ErrorBoundary from '../src/ui/ErrorBoundary';

const Boom = (): never => {
  throw new Error('boom');
};

const wrap = async (node: React.ReactElement) => render(<BeyouThemeProvider>{node}</BeyouThemeProvider>);

test('renders children when there is no error', async () => {
  await wrap(<ErrorBoundary><Text>safe content</Text></ErrorBoundary>);
  expect(screen.getByText('safe content')).toBeTruthy();
});

test('shows the fallback when a child throws', async () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  await wrap(<ErrorBoundary><Boom /></ErrorBoundary>);
  expect(screen.getByTestId('error-boundary')).toBeTruthy();
  expect(screen.getByText('Something went wrong')).toBeTruthy();
  expect(screen.getByTestId('error-retry')).toBeTruthy();
  spy.mockRestore();
});

/**
 * G4/#28. `reset()` clears `hasError`, which unmounts the whole fallback — and
 * with it the `ErrorReport` mid-send. Retry-after-Send therefore discards the
 * crash report silently, on the one screen that exists to capture crashes
 * nobody would otherwise report. Same defect and same fix shape as web's
 * Reload button.
 */
test('retry is blocked while the crash report is still sending', async () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

  let settle!: (value: unknown) => void;
  const post = jest.fn(
    () =>
      new Promise((resolve) => {
        settle = resolve;
      }),
  );
  const get = jest.fn(async () => ({ data: [] }));
  setHttpClient({ get, post, put: get, delete: get } as never);
  setLogger({ error: () => {} });

  // Throws once, so the retry-after-send case can actually recover.
  let shouldThrow = true;
  const Flaky = () => {
    if (shouldThrow) throw new Error('boom');
    return <Text>recovered</Text>;
  };

  await wrap(
    <ErrorBoundary>
      <Flaky />
    </ErrorBoundary>,
  );

  await act(async () => {
    fireEvent.press(screen.getByTestId('error-report-open'));
  });
  await act(async () => {
    fireEvent.press(screen.getByTestId('error-report-submit'));
  });
  await waitFor(() => expect(post).toHaveBeenCalledTimes(1));

  // Retry now would unmount the in-flight report. The panel must still be the
  // SAME open, sending one — not a fresh collapsed control with the report gone.
  await act(async () => {
    fireEvent.press(screen.getByTestId('error-retry'));
  });
  expect(screen.getByTestId('error-report-submit')).toBeTruthy();
  expect(screen.queryByTestId('error-report-open')).toBeNull();

  await act(async () => {
    settle({ data: { id: 'f1', category: 'BUG', body: 'x' } });
  });
  await waitFor(() => expect(screen.getByTestId('error-report-success')).toBeTruthy());

  // Once the report has landed, retry works exactly as before.
  shouldThrow = false;
  await act(async () => {
    fireEvent.press(screen.getByTestId('error-retry'));
  });
  expect(screen.getByText('recovered')).toBeTruthy();

  spy.mockRestore();
});
