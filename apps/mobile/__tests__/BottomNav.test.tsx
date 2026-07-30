/** BottomNav (global action bar) — renders all six items, navigates, and marks the current route. */
const mockPush = jest.fn();
let mockPathname = '/';
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  usePathname: () => mockPathname,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
}));

import { render, screen, fireEvent, act, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import BottomNav from '../src/ui/dashboard/BottomNav';

const ITEM_KEYS = ['categories', 'tasks', 'habits', 'routines', 'goals', 'config'] as const;

const renderNav = (pathname = '/') => {
  mockPathname = pathname;
  return render(
    <BeyouThemeProvider>
      <BottomNav />
    </BeyouThemeProvider>,
  );
};

/** Which items report themselves as the current page, in bar order. */
const selectedKeys = () =>
  ITEM_KEYS.filter((key) => screen.getByTestId(`nav-${key}`).props.accessibilityState?.selected);

/**
 * The label colour the item actually renders with — the visual side of "active".
 * The item's own accessibilityLabel locates its text, so this stays correct in
 * either language without duplicating the translation table here.
 */
const labelColor = (key: string) => {
  const item = screen.getByTestId(`nav-${key}`);
  const label = within(item).getByText(item.props.accessibilityLabel);
  return StyleSheet.flatten(label.props.style)?.color;
};

describe('BottomNav', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockPathname = '/';
  });

  it('renders all six nav items', async () => {
    await renderNav();
    for (const key of ITEM_KEYS) {
      expect(screen.getByTestId(`nav-${key}`)).toBeTruthy();
    }
  });

  it('navigates to the matching route on press', async () => {
    await renderNav();
    // act-wrapped per AGENTS.md: an unwrapped press lets the theme provider's
    // settle leak into the NEXT test in this file and corrupt its render.
    await act(async () => {
      fireEvent.press(screen.getByTestId('nav-habits'));
    });
    expect(mockPush).toHaveBeenCalledWith('/habits');
    await act(async () => {
      fireEvent.press(screen.getByTestId('nav-routines'));
    });
    expect(mockPush).toHaveBeenCalledWith('/routines');
  });
});

/**
 * The filled-primary treatment answers "where am I?", so exactly one item may
 * carry it. It used to be a static flag on Habits + Routines, which meant the
 * bar showed the same two items filled no matter where you were: decoration,
 * not orientation.
 *
 * `accessibilityState.selected` is the anchor rather than a style value — it is
 * what a screen reader announces, and it comes from the same match that drives
 * the colour. One test then pins the colour to it so the two can't drift.
 */
describe('BottomNav active item', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockPathname = '/';
  });

  it.each([
    ['/categories', ['categories']],
    ['/tasks', ['tasks']],
    ['/habits', ['habits']],
    ['/routines', ['routines']],
    ['/goals', ['goals']],
    ['/configuration', ['config']],
    // The dashboard has no entry in the bar, so nothing is highlighted there.
    ['/', []],
  ])('on %s selects %s', async (pathname, expected) => {
    await renderNav(pathname);
    expect(selectedKeys()).toEqual(expected);
  });

  it('keeps a nested path on its section', async () => {
    // A future detail route (/routines/:id) must still light Routines — exact
    // equality would silently blank the bar there.
    await renderNav('/routines/abc-123');
    expect(selectedKeys()).toEqual(['routines']);
  });

  it('does not let one route bleed into a similarly named one', async () => {
    await renderNav('/goals-archive');
    expect(selectedKeys()).toEqual([]);
  });

  it('colours the current item differently, and the rest identically', async () => {
    await renderNav('/goals');

    const active = labelColor('goals');
    const others = ITEM_KEYS.filter((k) => k !== 'goals').map(labelColor);

    // Compared relatively rather than against a hex, so a theme change or a new
    // palette can't turn this into a false failure.
    expect(active).toBeDefined();
    expect(others).not.toContain(active);
    expect(new Set(others).size).toBe(1);
  });
});
