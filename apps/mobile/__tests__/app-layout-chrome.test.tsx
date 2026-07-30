/**
 * The (app) layout owns the global chrome. The bottom bar used to be rendered
 * by the dashboard screen alone, so on every other authenticated screen the
 * only way to reach another section was to navigate back to the dashboard
 * first. It is mounted here now, beside the feedback launcher and the
 * assistant, so it follows the user across screens.
 *
 * NOTE: no JSX / React.createElement inside these hoisted jest.mock factories —
 * with this project's babel config any element creation there is rewritten to
 * reference the injected _ReactNativeCSSInterop helper, which
 * babel-plugin-jest-hoist rejects as an out-of-scope variable. Component
 * REFERENCES are fine; the elements are created by the real layout at render
 * time. (Same constraint documented at length in `_layout.test.tsx`.)
 */
var mockPathname = '/habits';

jest.mock('expo-router', () => ({
  // The layout renders <Stack/> for the screen area; a plain View stands in for
  // the navigator. The extra `screenOptions` prop is inert on a View.
  Stack: require('react-native').View,
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false }),
  usePathname: () => mockPathname,
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaInsetsContext: React.createContext({ top: 0, right: 0, bottom: 0, left: 0 }),
    SafeAreaProvider: ({ children }: { children: unknown }) => children,
  };
});

// Not under test here, and it opens a chat modal + SSE plumbing on mount.
jest.mock('../src/ui/agent/AgentWidget', () => ({ __esModule: true, default: () => null }));

import { Provider } from 'react-redux';
import { render, screen } from '@testing-library/react-native';
import '../src/i18n';
import { makeStore } from '../src/store';
import { tutorialCompletedEnter } from '@beyou/state/user/perfilSlice';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import AppLayout from '../app/(app)/_layout';

const AUTHENTICATED_ROUTES = [
  '/', // dashboard
  '/categories',
  '/tasks',
  '/habits',
  '/routines',
  '/goals',
  '/configuration',
  '/feedback',
];

const renderLayout = async () => {
  const store = makeStore();
  store.dispatch(tutorialCompletedEnter(true));
  return render(
    <Provider store={store}>
      <BeyouThemeProvider>
        <AppLayout />
      </BeyouThemeProvider>
    </Provider>,
  );
};

/** RN styles arrive as an object, an array, or nested arrays. */
const flattenStyle = (style: unknown): Record<string, unknown> => {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenStyle));
  return (style ?? {}) as Record<string, unknown>;
};

describe('(app) layout chrome', () => {
  it.each(AUTHENTICATED_ROUTES)('mounts the bottom bar on %s', async (route) => {
    mockPathname = route;
    await renderLayout();

    expect(screen.getAllByTestId('bottom-nav')).toHaveLength(1);
  });

  it('offers all six sections from any screen', async () => {
    mockPathname = '/goals';
    await renderLayout();

    for (const key of ['categories', 'tasks', 'habits', 'routines', 'goals', 'config']) {
      expect(screen.getByTestId(`nav-${key}`)).toBeTruthy();
    }
  });

  /**
   * The native clearance answer, and the reason no screen needs a spacer: the
   * bar is a sibling in the layout's flex column, not an overlay. The screen
   * area above it takes the remaining height, so content is laid out ABOVE the
   * bar rather than underneath it. If the bar ever became absolutely
   * positioned it would start covering the last row of every list.
   */
  it('takes its own space instead of covering the screen', async () => {
    mockPathname = '/habits';
    await renderLayout();

    const screenArea = flattenStyle(screen.getByTestId('app-screen-area').props.style);
    expect(screenArea.flex).toBe(1);

    const bar = flattenStyle(screen.getByTestId('bottom-nav').props.style);
    expect(bar.position).toBeUndefined();
    expect(bar.flex).toBeUndefined();
  });
});
