/**
 * Feedback screen (U11) — the deliberate reporting path on mobile.
 *
 * Locks in: renders in en + pt, a stored submission shows the confirmation, a
 * submission that never reached the server surfaces the `mailto:` alternative,
 * and a report opened from an intact screen carries the captured screenshot
 * through the native uploader (KTD3/KTD5).
 *
 * Boundary mocked = expo-router, expo-image-picker, RN Linking, the @beyou/api
 * HttpClient and the feedback native uploader.
 */
var mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

import { Linking } from 'react-native';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import {
  setHttpClient,
  setLogger,
  setFeedbackNativeUploader,
  resetFeedbackNativeUploader,
} from '@beyou/api';
import i18n from '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import FeedbackScreen from '../app/(app)/feedback';

type Uploader = jest.Mock;

let post: jest.Mock;
let uploader: Uploader;

const setHttp = (impl: (url: string, body: unknown) => Promise<unknown>) => {
  post = jest.fn(impl);
  const get = jest.fn(async () => ({ data: [] }));
  setHttpClient({ get, post, put: get, delete: get } as never);
  setLogger({ error: () => {} });
};

const renderScreen = () =>
  render(
    <BeyouThemeProvider>
      <FeedbackScreen />
    </BeyouThemeProvider>,
  );

const fillAndSubmit = async (body = 'the routine screen freezes') => {
  await act(async () => {
    fireEvent.press(screen.getByTestId('feedback-category-BUG'));
  });
  await act(async () => {
    fireEvent.changeText(screen.getByTestId('feedback-body'), body);
  });
  await act(async () => {
    fireEvent.press(screen.getByTestId('feedback-submit'));
  });
};

beforeEach(() => {
  mockParams = {};
  uploader = jest.fn(async () => ({ status: 201, data: { id: 'a1' } }));
  setFeedbackNativeUploader(uploader as never);
  setHttp(async () => ({ data: { id: 'f1', category: 'BUG', body: 'x' } }));
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
});

afterEach(async () => {
  resetFeedbackNativeUploader();
  jest.restoreAllMocks();
  await act(async () => {
    await i18n.changeLanguage('en');
  });
});

describe('FeedbackScreen', () => {
  it('renders the form in English', async () => {
    await renderScreen();
    expect(screen.getByText('What is this about?')).toBeTruthy();
    expect(screen.getByText('Your message')).toBeTruthy();
    expect(screen.getByTestId('feedback-submit')).toBeTruthy();
    expect(screen.getByTestId('feedback-mailto-preference')).toBeTruthy();
  });

  it('renders the form in Portuguese', async () => {
    await act(async () => {
      await i18n.changeLanguage('pt');
    });
    await renderScreen();
    expect(screen.getByText('Sobre o que é?')).toBeTruthy();
    expect(screen.getByText('Sua mensagem')).toBeTruthy();
  });

  it('shows the confirmation after a stored submission', async () => {
    await renderScreen();
    await fillAndSubmit();

    await waitFor(() => expect(screen.getByTestId('feedback-success')).toBeTruthy());
    expect(screen.getByText('Thanks — we got it.')).toBeTruthy();
    expect(post).toHaveBeenCalledWith(
      '/feedback',
      expect.objectContaining({ category: 'BUG', body: 'the routine screen freezes' }),
    );
  });

  it('surfaces the mailto alternative when nothing was recorded', async () => {
    setHttp(async () => {
      throw new Error('network down');
    });
    await renderScreen();
    await fillAndSubmit();

    await waitFor(() => expect(screen.getByTestId('feedback-failure')).toBeTruthy());
    const fallback = screen.getByTestId('feedback-mailto-fallback');
    await act(async () => {
      fireEvent.press(fallback);
    });
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('mailto:'));
  });

  it('carries the captured screenshot when opened from an intact screen', async () => {
    mockParams = { capture: 'file:///tmp/screen.jpg', from: '/routines' };
    await renderScreen();
    await fillAndSubmit();

    await waitFor(() => expect(screen.getByTestId('feedback-success')).toBeTruthy());
    expect(uploader).toHaveBeenCalledWith(
      expect.objectContaining({ uri: 'file:///tmp/screen.jpg', fieldName: 'file' }),
    );
    // The capture is reported against the screen it was taken on, not /feedback.
    expect(post).toHaveBeenCalledWith(
      '/feedback',
      expect.objectContaining({ context: expect.objectContaining({ screen: '/routines' }) }),
    );
  });
});
