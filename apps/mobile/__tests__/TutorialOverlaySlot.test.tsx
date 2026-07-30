/**
 * Slot semantics: who owns the single overlay, and what happens when two screens
 * are mounted at once (the navigator keeps the previous screen alive across a
 * push, so both publishers exist for a moment).
 */
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaInsetsContext: React.createContext({ top: 0, right: 0, bottom: 0, left: 0 }),
    SafeAreaProvider: ({ children }: { children: unknown }) => children,
  };
});

var mockRects: Record<string, { x: number; y: number; width: number; height: number }> = {};
jest.mock('../src/tutorial/TutorialProvider', () => {
  const actual = jest.requireActual('../src/tutorial/TutorialProvider');
  return {
    ...actual,
    useTutorialRegistry: () => ({
      register: () => {},
      unregister: () => {},
      measure: async (id: string) => mockRects[id] ?? null,
    }),
  };
});

import { Text } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import '../src/i18n';
import { BeyouThemeProvider } from '../src/theme/ThemeProvider';
import { TutorialOverlayHost, useSpotlightSlot, type SpotlightController } from '../src/tutorial/TutorialOverlaySlot';
import type { SpotlightStep } from '../src/tutorial/steps/types';

const stepFor = (targetId: string): SpotlightStep => ({
  id: targetId, targetId, titleKey: 'TutorialNext', descKey: 'TutorialSkip',
});

const controller = (over: Partial<SpotlightController> & { targetId?: string } = {}): SpotlightController => ({
  active: true,
  steps: [stepFor(over.targetId ?? 'alpha')],
  stepIndex: 0,
  next: jest.fn(),
  prev: jest.fn(),
  skip: jest.fn(),
  ...over,
});

/** A stand-in screen: owns its tutorial hook's output, publishes it to the slot. */
function Screen({ label, ctrl }: { label: string; ctrl: SpotlightController }) {
  useSpotlightSlot(ctrl);
  return <Text testID={`screen-${label}`}>{label}</Text>;
}

const wrap = (children: React.ReactNode) => (
  <BeyouThemeProvider>
    <TutorialOverlayHost>{children}</TutorialOverlayHost>
  </BeyouThemeProvider>
);

beforeEach(() => {
  jest.useFakeTimers();
  mockRects = {
    alpha: { x: 10, y: 20, width: 30, height: 40 },
    beta: { x: 100, y: 200, width: 300, height: 400 },
  };
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

const flattenStyle = (style: unknown): Record<string, number | undefined> => {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenStyle));
  return (style ?? {}) as Record<string, number | undefined>;
};

const ringTop = () => flattenStyle(screen.getByTestId('spotlight-ring').props.style).top;

test('renders nothing until a screen publishes', async () => {
  await render(wrap(<Text testID="quiet">quiet</Text>));
  expect(screen.queryByTestId('spotlight-overlay')).toBeNull();
});

test('renders the overlay a screen publishes, and routes its handlers back', async () => {
  const ctrl = controller();
  await render(wrap(<Screen label="a" ctrl={ctrl} />));
  await act(async () => {});

  expect(screen.getByTestId('spotlight-overlay')).toBeTruthy();
  expect(ringTop()).toBe(20 - 8); // alpha's rect, padded

  await act(async () => { fireEvent.press(screen.getByTestId('spotlight-next')); });
  expect(ctrl.next).toHaveBeenCalled();
  await act(async () => { fireEvent.press(screen.getByTestId('spotlight-skip')); });
  expect(ctrl.skip).toHaveBeenCalled();
});

test('an inactive controller publishes nothing', async () => {
  await render(wrap(<Screen label="a" ctrl={controller({ active: false })} />));
  await act(async () => {});
  expect(screen.queryByTestId('spotlight-overlay')).toBeNull();
});

test('clears the slot when the publishing screen unmounts', async () => {
  const { rerender } = await render(wrap(<Screen label="a" ctrl={controller()} />));
  await act(async () => {});
  expect(screen.getByTestId('spotlight-overlay')).toBeTruthy();

  await rerender(wrap(<Text testID="quiet">quiet</Text>));
  await act(async () => {});
  expect(screen.queryByTestId('spotlight-overlay')).toBeNull();
});

test('last writer wins when two screens are mounted at once', async () => {
  await render(
    wrap(
      <>
        <Screen label="a" ctrl={controller({ targetId: 'alpha' })} />
        <Screen label="b" ctrl={controller({ targetId: 'beta' })} />
      </>,
    ),
  );
  await act(async () => {});

  // One overlay, owned by the screen that published last.
  expect(screen.getAllByTestId('spotlight-overlay')).toHaveLength(1);
  expect(ringTop()).toBe(200 - 8); // beta
});

test("an outgoing screen's cleanup cannot wipe the incoming screen's overlay", async () => {
  const { rerender } = await render(
    wrap(
      <>
        <Screen label="a" ctrl={controller({ targetId: 'alpha' })} />
        <Screen label="b" ctrl={controller({ targetId: 'beta' })} />
      </>,
    ),
  );
  await act(async () => {});
  expect(ringTop()).toBe(200 - 8); // beta owns the slot

  // The previous screen finally unmounts, after the new one already published.
  await rerender(wrap(<Screen label="b" ctrl={controller({ targetId: 'beta' })} />));
  await act(async () => {});

  expect(screen.getByTestId('spotlight-overlay')).toBeTruthy();
  expect(ringTop()).toBe(200 - 8);
});

test('follows the owning screen from step to step', async () => {
  const twoSteps: SpotlightStep[] = [stepFor('alpha'), stepFor('beta')];
  const { rerender } = await render(
    wrap(<Screen label="a" ctrl={controller({ steps: twoSteps, stepIndex: 0 })} />),
  );
  await act(async () => {});
  expect(ringTop()).toBe(20 - 8);

  await rerender(wrap(<Screen label="a" ctrl={controller({ steps: twoSteps, stepIndex: 1 })} />));
  await act(async () => {});
  expect(ringTop()).toBe(200 - 8);
});

/**
 * `useRoutinesTutorial` rebuilds its `steps` array on every render (it stamps a
 * `disabled` flag onto the `add` step), so a slot keyed on object identity would
 * republish forever. Content-equal republishes must be no-ops.
 */
test('a content-identical republish does not churn the overlay', async () => {
  const rebuilt = () => controller({ steps: [{ ...stepFor('alpha') }] });
  const { rerender } = await render(wrap(<Screen label="a" ctrl={rebuilt()} />));
  await act(async () => {});
  const first = screen.getByTestId('spotlight-overlay');

  await rerender(wrap(<Screen label="a" ctrl={rebuilt()} />));
  await act(async () => {});

  expect(screen.getByTestId('spotlight-overlay')).toBe(first);
  expect(ringTop()).toBe(20 - 8);
});
