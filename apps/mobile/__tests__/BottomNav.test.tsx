/**
 * BottomNav (global action bar). Five targets since the redesign — Today,
 * Routines, [Assistant], Habits, More — with everything that left the bar one
 * tap away inside the "More" sheet.
 */
const mockPush = jest.fn();
let mockPathname = '/';
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  usePathname: () => mockPathname,
}));
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    // The "More" sheet reads the inset through context.
    SafeAreaInsetsContext: React.createContext({ top: 0, right: 0, bottom: 0, left: 0 }),
    SafeAreaProvider: ({ children }: { children: unknown }) => children,
  };
});

// Records which tutorial anchors the bar registers, so the dashboard tutorial's
// target can be asserted without a layout engine.
var mockRegisteredTargets = new Set<string>();
jest.mock('../src/tutorial/TutorialProvider', () => {
  const actual = jest.requireActual('../src/tutorial/TutorialProvider');
  return {
    ...actual,
    useTutorialRegistry: () => ({
      register: (id: string) => {
        if (id) mockRegisteredTargets.add(id);
      },
      unregister: (id: string) => mockRegisteredTargets.delete(id),
      measure: async () => null,
    }),
  };
});

import { Provider } from 'react-redux';
import { render, screen, fireEvent, act, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { tutorialCompletedEnter } from '@beyou/state/user/perfilSlice';
import '../src/i18n';
import { makeStore } from '../src/store';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import BottomNav from '../src/ui/dashboard/BottomNav';
import { onAgentPanelOpen } from '../src/ui/agent/agentPanelBus';

/** The four labelled destinations in the bar, in bar order. */
const BAR_KEYS = ['navdashboard', 'routines', 'habits', 'more'] as const;
/** What moved into the sheet — same i18n keys as before the redesign. */
const SHEET_KEYS = ['tasks', 'goals', 'categories', 'config', 'feedbackshortcutlabel'] as const;

const renderNav = async (pathname = '/', { isTutorialCompleted = true } = {}) => {
  mockPathname = pathname;
  const store = makeStore();
  store.dispatch(tutorialCompletedEnter(isTutorialCompleted));
  return render(
    <Provider store={store}>
      <BeyouThemeProvider>
        <BottomNav />
      </BeyouThemeProvider>
    </Provider>,
  );
};

const openSheet = async () => {
  await act(async () => {
    fireEvent.press(screen.getByTestId('nav-more'));
  });
};

/** Which items report themselves as the current page, in bar order. */
const selectedKeys = () =>
  BAR_KEYS.filter((key) => screen.getByTestId(`nav-${key}`).props.accessibilityState?.selected);

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
    mockRegisteredTargets.clear();
  });

  it('renders the five bar targets', async () => {
    await renderNav();
    for (const key of BAR_KEYS) {
      expect(screen.getByTestId(`nav-${key}`)).toBeTruthy();
    }
    expect(screen.getByTestId('nav-agent')).toBeTruthy();
  });

  it('navigates to the matching route on press', async () => {
    await renderNav('/habits');
    // act-wrapped per AGENTS.md: an unwrapped press lets the theme provider's
    // settle leak into the NEXT test in this file and corrupt its render.
    await act(async () => {
      fireEvent.press(screen.getByTestId('nav-navdashboard'));
    });
    expect(mockPush).toHaveBeenCalledWith('/');
    await act(async () => {
      fireEvent.press(screen.getByTestId('nav-routines'));
    });
    expect(mockPush).toHaveBeenCalledWith('/routines');
  });
});

/**
 * The centre button is the ONLY way into the agent on mobile now — the floating
 * bubble is gone from every screen the bar covers, which is all of them. It
 * cannot own the chat state (that lives in AgentWidget, which must survive
 * navigation), so it asks for the panel over the module bus.
 */
describe('BottomNav assistant button', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockPathname = '/';
  });

  it('asks the assistant panel to open', async () => {
    const opened = jest.fn();
    const unsubscribe = onAgentPanelOpen(opened);
    await renderNav();

    await act(async () => {
      fireEvent.press(screen.getByTestId('nav-agent'));
    });

    expect(opened).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('stays hidden until onboarding is finished', async () => {
    // Same gate as AgentWidget: while the tutorial owns
    // the screen the button would open nothing, so it must not be there.
    await renderNav('/', { isTutorialCompleted: false });
    expect(screen.queryByTestId('nav-agent')).toBeNull();
    expect(screen.getByTestId('nav-more')).toBeTruthy();
  });
});

/**
 * Four destinations moved behind "More". They must still be one tap away, and
 * still carry the labels the rest of the app (and the user) knows them by.
 */
describe('BottomNav "More" sheet', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockPathname = '/';
  });

  it('keeps the sheet destinations out of the tree until it is opened', async () => {
    await renderNav();
    for (const key of SHEET_KEYS) {
      expect(screen.queryByTestId(`nav-${key}`)).toBeNull();
    }
  });

  it('offers every remaining section once opened', async () => {
    await renderNav();
    await openSheet();
    for (const key of SHEET_KEYS) {
      expect(screen.getByTestId(`nav-${key}`)).toBeTruthy();
    }
  });

  it('navigates and closes itself on a tile press', async () => {
    await renderNav();
    await openSheet();
    await act(async () => {
      fireEvent.press(screen.getByTestId('nav-categories'));
    });

    expect(mockPush).toHaveBeenCalledWith('/categories');
    expect(screen.queryByTestId('nav-categories')).toBeNull();
  });

  /**
   * The dashboard tutorial's second step spotlights `nav-categories`, and the
   * overlay can only frame a target it can measure — i.e. one that is mounted.
   * Categories lives behind "More" now, so the anchor rides the button that
   * leads there and stays registered with the sheet closed.
   */
  it('keeps the nav-categories tutorial anchor mounted with the sheet closed', async () => {
    await renderNav();
    expect(mockRegisteredTargets.has('nav-categories')).toBe(true);
    expect(mockRegisteredTargets.has('nav-routines')).toBe(true);
    expect(mockRegisteredTargets.has('nav-habits')).toBe(true);
  });
});

/**
 * The accent treatment answers "where am I?", so exactly one item may carry it.
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
    ['/', ['navdashboard']],
    ['/routines', ['routines']],
    ['/habits', ['habits']],
    // Everything inside the sheet lights "More" — otherwise the bar would go
    // mute on four of the app's screens.
    ['/categories', ['more']],
    ['/tasks', ['more']],
    ['/goals', ['more']],
    ['/configuration', ['more']],
    ['/feedback', ['more']],
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
    await renderNav('/habits');

    const active = labelColor('habits');
    const others = BAR_KEYS.filter((k) => k !== 'habits').map(labelColor);

    // Compared relatively rather than against a hex, so a theme change or a new
    // palette can't turn this into a false failure.
    expect(active).toBeDefined();
    expect(others).not.toContain(active);
    expect(new Set(others).size).toBe(1);
  });
});

/**
 * The "More" panel covered the bar back when it was a Modal. It now lives above the
 * bar, and the shortcuts stay visible and tappable — the bar is what answers "where
 * am I".
 */
describe('BottomNav "More" panel placement', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockPathname = '/';
  });

  it('keeps the bar mounted alongside the open panel', async () => {
    await renderNav();
    await openSheet();

    expect(screen.getByTestId('nav-more-sheet')).toBeTruthy();
    expect(screen.getByTestId('bottom-nav')).toBeTruthy();
    expect(screen.getByTestId('nav-routines')).toBeTruthy();
  });

  it('anchors the panel above the bar instead of over it', async () => {
    await renderNav();
    await openSheet();

    const style = StyleSheet.flatten(screen.getByTestId('nav-more-sheet').props.style);
    expect(style.position).toBe('absolute');
    expect(style.bottom).toBe('100%');
  });

  it('closes from the backdrop and from a second tap on More', async () => {
    await renderNav();
    await openSheet();
    await act(async () => {
      fireEvent.press(screen.getByTestId('nav-more-backdrop'));
    });
    expect(screen.queryByTestId('nav-more-sheet')).toBeNull();

    await openSheet();
    await act(async () => {
      fireEvent.press(screen.getByTestId('nav-more'));
    });
    expect(screen.queryByTestId('nav-more-sheet')).toBeNull();
  });
});
