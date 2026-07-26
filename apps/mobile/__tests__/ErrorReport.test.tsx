/**
 * ErrorReport (U11 / KTD3) — the optional report control on the crash boundary.
 *
 * The failed screen has already been replaced by the fallback, so there is
 * nothing intact left to photograph: the report carries the error text and the
 * component stack and NO attachment. When the submission itself cannot reach
 * the server the `mailto:` alternative appears.
 */
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false }),
  useLocalSearchParams: () => ({}),
}));

import { Linking } from 'react-native';
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
});
