/**
 * FeedbackLauncher (U11) — the always-available entry point (R1) and the place
 * the intact-screen capture is taken (R9/KTD3): the snapshot has to happen
 * BEFORE navigating, or the form covers the screen being reported.
 */
var mockPush: jest.Mock;
var mockPathname = '/routines';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => false }),
  usePathname: () => mockPathname,
}));

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { captureScreen } from 'react-native-view-shot';
import '../src/i18n';
import { makeStore } from '../src/store';
import { tutorialCompletedEnter } from '@beyou/state/user/perfilSlice';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import FeedbackLauncher from '../src/ui/feedback/FeedbackLauncher';

const renderLauncher = (tutorialCompleted: boolean) => {
  const store = makeStore();
  store.dispatch(tutorialCompletedEnter(tutorialCompleted));
  return render(
    <Provider store={store}>
      <BeyouThemeProvider>
        <FeedbackLauncher />
      </BeyouThemeProvider>
    </Provider>,
  );
};

beforeEach(() => {
  mockPush = jest.fn();
  mockPathname = '/routines';
  (captureScreen as jest.Mock).mockClear();
  (captureScreen as jest.Mock).mockResolvedValue('file:///tmp/screen.jpg');
});

describe('FeedbackLauncher', () => {
  it('captures the current screen and forwards it with the route it came from', async () => {
    await renderLauncher(true);
    await act(async () => {
      fireEvent.press(screen.getByTestId('feedback-fab'));
    });

    expect(captureScreen).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/feedback',
      params: { from: '/routines', capture: 'file:///tmp/screen.jpg' },
    });
  });

  it('still opens the form when the capture fails', async () => {
    (captureScreen as jest.Mock).mockRejectedValue(new Error('no native module'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await renderLauncher(true);
    await act(async () => {
      fireEvent.press(screen.getByTestId('feedback-fab'));
    });

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/feedback', params: { from: '/routines' } });
    spy.mockRestore();
  });

  /**
   * #31. `disabled={capturing}` only bites after React commits the state, and
   * `captureCurrentScreen()` is a native call — a window wide enough for a real
   * double-tap. Two captures and two `router.push` calls is a visibly broken
   * navigation stack, so the guard has to be synchronous.
   */
  it('captures once when the launcher is double-tapped', async () => {
    let settle!: (uri: string) => void;
    (captureScreen as jest.Mock).mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          settle = resolve;
        }),
    );

    await renderLauncher(true);
    const fab = screen.getByTestId('feedback-fab');

    // Two touch events delivered before React can re-render — what the native
    // layer does on a fast double-tap.
    await act(async () => {
      fireEvent.press(fab);
      fireEvent.press(fab);
    });

    expect(captureScreen).toHaveBeenCalledTimes(1);

    await act(async () => {
      settle('file:///tmp/screen.jpg');
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('stays out of the way during onboarding and on the feedback screen itself', async () => {
    await renderLauncher(false);
    expect(screen.queryByTestId('feedback-fab')).toBeNull();

    mockPathname = '/feedback';
    await renderLauncher(true);
    expect(screen.queryByTestId('feedback-fab')).toBeNull();
  });
});
