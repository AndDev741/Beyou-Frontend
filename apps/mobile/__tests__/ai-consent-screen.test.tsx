/**
 * The AI consent screen: what it discloses, and what each answer does.
 *
 * Apple's 5.1.2(i) asks for two things, and these are the ones asserted: the screen names who
 * receives the data and what is sent BEFORE the person answers, and the answer reaches the
 * server (where a "no" switches the AI routes off) before the session moves on.
 */
const mockSetAiConsent = jest.fn();
const mockNotifyError = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockCanGoBack = false;

jest.mock('@beyou/api/user/setAiConsent', () => ({
  __esModule: true,
  default: (granted: boolean) => mockSetAiConsent(granted),
}));

jest.mock('../src/notify', () => ({
  notify: { error: (message: string) => mockNotifyError(message), success: jest.fn() },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack, canGoBack: () => mockCanGoBack }),
}));

import { Provider } from 'react-redux';
import { render, screen, act, fireEvent } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import { makeStore } from '../src/store';
import { login } from '../src/auth/authSlice';
import AiConsentScreen from '../app/ai-consent';

const signedInStore = () => {
  const store = makeStore();
  store.dispatch({ type: login.fulfilled.type, payload: { name: 'Ana', aiConsent: 'UNASKED' } });
  return store;
};

const wrap = async (store = signedInStore()) => {
  await render(
    <Provider store={store}>
      <BeyouThemeProvider>
        <AiConsentScreen />
      </BeyouThemeProvider>
    </Provider>,
  );
  return store;
};

describe('AI consent screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack = false;
  });

  it('names who receives the data and what is sent, before any answer', async () => {
    await wrap();
    const who = screen.getByTestId('ai-consent-who');
    expect(who).toHaveTextContent(/Mistral AI/);
    expect(who).toHaveTextContent(/Google Gemini/);
    expect(who).toHaveTextContent(/Tavily/);
    expect(screen.getByText(/What you write to the assistant/)).toBeTruthy();
    expect(screen.getByText(/Never sent: your email address, your password/)).toBeTruthy();
    expect(screen.getByTestId('ai-consent-allow')).toBeTruthy();
    expect(screen.getByTestId('ai-consent-decline')).toBeTruthy();
    expect(mockSetAiConsent).not.toHaveBeenCalled();
  });

  it('a yes is sent to the server, kept in the session, and opens the app', async () => {
    mockSetAiConsent.mockResolvedValue({ data: { aiConsent: 'GRANTED' } });
    const store = await wrap();

    await act(async () => {
      fireEvent.press(screen.getByTestId('ai-consent-allow'));
    });

    expect(mockSetAiConsent).toHaveBeenCalledWith(true);
    expect(store.getState().auth.profile?.aiConsent).toBe('GRANTED');
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('a no is sent too, and goes back when the screen was opened from inside the app', async () => {
    mockCanGoBack = true;
    mockSetAiConsent.mockResolvedValue({ data: { aiConsent: 'DECLINED' } });
    const store = await wrap();

    await act(async () => {
      fireEvent.press(screen.getByTestId('ai-consent-decline'));
    });

    expect(mockSetAiConsent).toHaveBeenCalledWith(false);
    expect(store.getState().auth.profile?.aiConsent).toBe('DECLINED');
    expect(mockBack).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('an answer the server did not take leaves the question open and says so', async () => {
    mockSetAiConsent.mockResolvedValue({ error: { errorKey: 'UnexpectedError' } });
    const store = await wrap();

    await act(async () => {
      fireEvent.press(screen.getByTestId('ai-consent-allow'));
    });

    expect(store.getState().auth.profile?.aiConsent).toBe('UNASKED');
    expect(mockNotifyError).toHaveBeenCalledWith('Your answer was not saved. Check your connection and try again.');
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
