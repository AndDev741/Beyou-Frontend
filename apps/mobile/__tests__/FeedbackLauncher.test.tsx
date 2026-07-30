/**
 * FeedbackLauncher (U11) — the always-available entry point (R1) and the place
 * the intact-screen capture is taken (R9/KTD3): the snapshot has to happen
 * BEFORE navigating, or the form covers the screen being reported.
 */
var mockPush: jest.Mock;
var mockPathname = '/configuration';

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
  mockPathname = '/configuration';
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
      params: { from: '/configuration', capture: 'file:///tmp/screen.jpg' },
    });
  });

  it('still opens the form when the capture fails', async () => {
    (captureScreen as jest.Mock).mockRejectedValue(new Error('no native module'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await renderLauncher(true);
    await act(async () => {
      fireEvent.press(screen.getByTestId('feedback-fab'));
    });

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/feedback', params: { from: '/configuration' } });
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

  it('stays out of the way during onboarding', async () => {
    await renderLauncher(false);
    expect(screen.queryByTestId('feedback-fab')).toBeNull();
  });

  /**
   * The bubble narrowed to the configuration screen once BottomNav became
   * global. The bar reaches Config in one tap from anywhere and Config carries
   * the bubble, so feedback is two taps from any screen — without spending a
   * seventh slot in a six-item bar (a seventh item has been declined twice).
   * A bubble floating over every screen buys one tap and costs permanent
   * furniture on a small display.
   *
   * The web app applies the same table, with one extra row: at desktop widths
   * it keeps the bubble on the other sections, because there is no bottom bar
   * there. Native has no desktop width, so the rule collapses to Config only.
   */
  const VISIBILITY = [
    { route: '/feedback', visible: false },
    { route: '/configuration', visible: true },
    { route: '/', visible: false }, // dashboard
    { route: '/categories', visible: false },
    { route: '/tasks', visible: false },
    { route: '/habits', visible: false },
    { route: '/routines', visible: false },
    { route: '/goals', visible: false },
  ];

  it.each(VISIBILITY)('$route -> visible: $visible', async ({ route, visible }) => {
    mockPathname = route;
    await renderLauncher(true);

    if (visible) {
      expect(screen.getByTestId('feedback-fab')).toBeTruthy();
    } else {
      expect(screen.queryByTestId('feedback-fab')).toBeNull();
    }
  });
});
