/**
 * Changing the AI answer from Configuration: off in one tap, on only through the consent
 * screen, so a yes is never given without the disclosure in front of the person.
 */
const mockSetAiConsent = jest.fn();
const mockNotifyError = jest.fn();
const mockNotifySuccess = jest.fn();
const mockPush = jest.fn();

jest.mock('@beyou/api/user/setAiConsent', () => ({
  __esModule: true,
  default: (granted: boolean) => mockSetAiConsent(granted),
}));

jest.mock('../src/notify', () => ({
  notify: {
    error: (message: string) => mockNotifyError(message),
    success: (message: string) => mockNotifySuccess(message),
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { Provider } from 'react-redux';
import { render, screen, act, fireEvent } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import { makeStore } from '../src/store';
import { login } from '../src/auth/authSlice';
import AiConsentSection from '../src/ui/config/AiConsentSection';

const wrap = async (aiConsent?: string, aiConsentOnDevice = false) => {
  const store = makeStore();
  store.dispatch({ type: login.fulfilled.type, payload: { name: 'Ana', aiConsent, aiConsentOnDevice } });
  await render(
    <Provider store={store}>
      <BeyouThemeProvider>
        <AiConsentSection />
      </BeyouThemeProvider>
    </Provider>,
  );
  return store;
};

describe('AiConsentSection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('turns the AI features off in one tap', async () => {
    mockSetAiConsent.mockResolvedValue({ data: { aiConsent: 'DECLINED' } });
    const store = await wrap('GRANTED');
    expect(screen.getByTestId('ai-consent-state')).toHaveTextContent(/^On\./);

    await act(async () => {
      fireEvent.press(screen.getByTestId('ai-consent-turn-off'));
    });

    expect(mockSetAiConsent).toHaveBeenCalledWith(false);
    expect(store.getState().auth.profile?.aiConsent).toBe('DECLINED');
    expect(mockNotifySuccess).toHaveBeenCalledWith('AI features are off.');
    expect(screen.getByTestId('ai-consent-state')).toHaveTextContent(/^Off\./);
  });

  it('turning them on opens the consent screen instead of saying yes itself', async () => {
    await wrap('DECLINED');

    await act(async () => {
      fireEvent.press(screen.getByTestId('ai-consent-turn-on'));
    });

    expect(mockPush).toHaveBeenCalledWith('/ai-consent');
    expect(mockSetAiConsent).not.toHaveBeenCalled();
  });

  it('says so when the server does not take the change', async () => {
    mockSetAiConsent.mockResolvedValue({ error: { errorKey: 'UnexpectedError' } });
    const store = await wrap('GRANTED');

    await act(async () => {
      fireEvent.press(screen.getByTestId('ai-consent-turn-off'));
    });

    expect(store.getState().auth.profile?.aiConsent).toBe('GRANTED');
    expect(mockNotifyError).toHaveBeenCalled();
  });

  it('renders nothing for a backend that does not know the field', async () => {
    await wrap(undefined);
    expect(screen.queryByTestId('ai-consent-section')).toBeNull();
  });

  it('keeps the change on the device when the backend cannot store it yet', async () => {
    const store = await wrap('GRANTED', true);

    await act(async () => {
      fireEvent.press(screen.getByTestId('ai-consent-turn-off'));
    });

    expect(mockSetAiConsent).not.toHaveBeenCalled();
    expect(store.getState().auth.profile?.aiConsent).toBe('DECLINED');
  });
});
