/**
 * ErrorReport (U11 / KTD3) — the optional report control on the crash boundary.
 *
 * The failed screen has already been replaced by the fallback, so there is
 * nothing intact left to photograph: the report carries the error text and the
 * component stack and NO attachment. When the submission itself cannot reach
 * the server the `mailto:` alternative appears.
 */
jest.mock('expo-router', () => ({
  // The real module's focus hook: screens use it to refresh on the way back.
  useFocusEffect: (callback: () => void | (() => void)) =>
    require('react').useEffect(() => callback(), [callback]),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false }),
  useLocalSearchParams: () => ({}),
}));

import { Alert, Linking } from 'react-native';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import {
  setHttpClient,
  setLogger,
  setFeedbackNativeUploader,
  resetFeedbackNativeUploader,
} from '@beyou/api';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import ErrorReport from '../src/ui/feedback/ErrorReport';

let post: jest.Mock;
let uploader: jest.Mock;

const setHttp = (impl: (url: string, body: unknown) => Promise<unknown>) => {
  post = jest.fn(impl);
  const get = jest.fn(async () => ({ data: [] }));
  setHttpClient({ get, post, put: get, delete: get } as never);
  setLogger({ error: () => {} });
};

const renderReport = () =>
  render(
    <BeyouThemeProvider>
      <ErrorReport error={new Error('cannot read routine of undefined')} componentStack={'\n    in RoutineDay\n    in Dashboard'} />
    </BeyouThemeProvider>,
  );

beforeEach(() => {
  uploader = jest.fn(async () => ({ status: 201, data: {} }));
  setFeedbackNativeUploader(uploader as never);
  setHttp(async () => ({ data: { id: 'f1', category: 'BUG', body: 'x' } }));
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
});

afterEach(() => {
  resetFeedbackNativeUploader();
  jest.restoreAllMocks();
});

describe('ErrorReport', () => {
  it('sends the error text and component stack with no image', async () => {
    await renderReport();
    await act(async () => {
      fireEvent.press(screen.getByTestId('error-report-open'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('error-report-submit'));
    });

    await waitFor(() => expect(screen.getByTestId('error-report-success')).toBeTruthy());

    expect(post).toHaveBeenCalledTimes(1);
    const [url, payload] = post.mock.calls[0] as [string, { category: string; body: string }];
    expect(url).toBe('/feedback');
    expect(payload.category).toBe('BUG');
    expect(payload.body).toContain('cannot read routine of undefined');
    expect(payload.body).toContain('in RoutineDay');
    // KTD3: no capture on the crash path — the screen is already gone.
    expect(uploader).not.toHaveBeenCalled();
  });

  it('offers the mailto alternative when the report cannot be sent', async () => {
    setHttp(async () => {
      throw new Error('offline');
    });
    await renderReport();
    await act(async () => {
      fireEvent.press(screen.getByTestId('error-report-open'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('error-report-submit'));
    });

    await waitFor(() => expect(screen.getByTestId('error-report-failure')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByTestId('error-report-mailto'));
    });
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('mailto:'));
  });

  /**
   * #29. No mail app is the norm on an emulator and common on Android, and
   * `Linking.openURL` REJECTS there. Unawaited and uncaught, the button does
   * nothing and raises an unhandled rejection — on the one screen whose whole
   * job is being the fallback. The address itself has to survive that.
   */
  it('shows the address instead of failing silently when no mail app exists', async () => {
    setHttp(async () => {
      throw new Error('offline');
    });
    // A rejecting implementation, not `mockRejectedValue` — the latter builds
    // the rejected promise here, which is itself briefly unhandled and would
    // pollute the unhandled-rejection assertion below.
    (Linking.openURL as jest.Mock).mockImplementation(() =>
      Promise.reject(new Error('No Activity found to handle Intent')),
    );
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', onUnhandled);

    try {
      await renderReport();
      await act(async () => {
        fireEvent.press(screen.getByTestId('error-report-open'));
      });
      await act(async () => {
        fireEvent.press(screen.getByTestId('error-report-submit'));
      });
      await waitFor(() => expect(screen.getByTestId('error-report-failure')).toBeTruthy());

      await act(async () => {
        fireEvent.press(screen.getByTestId('error-report-mailto'));
      });
      // Let node's microtask checkpoint run so a dangling rejection would surface.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }

    expect(unhandled).toEqual([]);
    // The raw address is the only thing left that still gets the report out.
    expect(alert).toHaveBeenCalled();
    expect(JSON.stringify(alert.mock.calls)).toContain('support@beyou.app');
  });
});
