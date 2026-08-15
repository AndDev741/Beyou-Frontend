/**
 * Lifting a modal off the keyboard, and putting it back down.
 *
 * Both halves have shipped broken, in opposite directions, so both are pinned here.
 *
 * First the lift was missing: a KeyboardAvoidingView left as a passthrough on Android,
 * on the reasoning that the OS pans the window — true of the app's window, never true
 * of a Modal's, which React Native hands SOFT_INPUT_ADJUST_RESIZE and which Android 15
 * ignores under edge-to-edge. The agent chat's composer sat under the keyboard.
 *
 * Then the return was missing: KeyboardAvoidingView's `frame.height - keyboardScreenY`
 * never reaches zero on hide, because Android reports the hidden keyboard resting at
 * the top of the navigation bar rather than at the bottom of the screen. One open and
 * close left the sheet floating a navigation bar above the bottom of the screen, for
 * good — with the screen behind showing through the gap.
 *
 * The hook uses no screen coordinates at all, which is what these tests are really
 * checking: a closed keyboard is a hard zero, and a window that already shrank is
 * measured rather than assumed.
 */
import { Keyboard, Text, View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useKeyboardLift } from '../src/ui/keyboard';

// Spying rather than mocking the module: replacing react-native wholesale takes
// Platform.select with it, and the Expo jest preset needs that at import time.
const listeners: Record<string, (event: unknown) => void> = {};

function Probe() {
  const { lift, onLayout } = useKeyboardLift();
  return (
    <View testID="probe" onLayout={onLayout}>
      <Text testID="lift">{String(lift)}</Text>
    </View>
  );
}

const lift = () => Number(screen.getByTestId('lift').props.children);

/** Rendered inside act, the way every mounting test in this suite does it. */
const mount = async () => {
  await act(async () => {
    render(<Probe />);
  });
};

// Every one of these is awaited: a synchronous act() inside an async test interleaves
// scopes, and React then warns about overlapping act calls while the state update it
// was meant to flush is still pending when the assertion reads it.
const measure = async (height: number) => {
  await act(async () => {
    fireEvent(screen.getByTestId('probe'), 'layout', {
      persist: () => {},
      nativeEvent: { layout: { x: 0, y: 0, width: 400, height } },
    });
  });
};

const show = async (height: number) => {
  await act(async () => {
    listeners.keyboardDidShow?.({ endCoordinates: { height } });
  });
};

const hide = async () => {
  await act(async () => {
    listeners.keyboardDidHide?.({});
  });
};

beforeEach(() => {
  for (const key of Object.keys(listeners)) delete listeners[key];
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((
    event: string,
    handler: (payload: unknown) => void,
  ) => {
    listeners[event] = handler;
    return { remove: () => delete listeners[event] };
  }) as never);
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('lifts by the keyboard height when the window does not move', async () => {
  await mount();
  await measure(900);
  expect(lift()).toBe(0);

  await show(300);

  // Android 15 under edge-to-edge: the window keeps its height and the keyboard draws
  // over it, so the whole 300 is ours to give up.
  expect(lift()).toBe(300);
});

it('returns to exactly zero when the keyboard hides', async () => {
  await mount();
  await measure(900);
  await show(300);

  await hide();

  // Zero, not "smaller than before". The old bug left a residue one navigation bar
  // tall, and a residue is exactly what the screen behind shows through.
  expect(lift()).toBe(0);
});

it('lifts by nothing when the window already gave up the space', async () => {
  await mount();
  await measure(900);

  await show(300);
  // Older Android still honours SOFT_INPUT_ADJUST_RESIZE, so the modal's own window
  // shrinks by the keyboard's height and the next layout arrives smaller.
  await measure(600);

  expect(lift()).toBe(0);
});

it('lifts by the remainder when the window gave up only part of it', async () => {
  await mount();
  await measure(900);

  await show(300);
  await measure(800);

  expect(lift()).toBe(200);
});

it('does not take a shrunken height as the baseline', async () => {
  await mount();
  await measure(900);
  await show(300);
  await measure(600);
  await hide();

  // Back to full height with nothing covering it, so the next keyboard has to lift the
  // full amount again. Keeping 600 as the baseline would call the window already
  // shrunk by 300 and leave the input under the keyboard.
  await measure(900);
  await show(300);

  expect(lift()).toBe(300);
});

it('re-baselines on rotation rather than comparing across orientations', async () => {
  await mount();
  await measure(900);
  await hide();

  // Landscape: shorter, and nothing covering it.
  await measure(400);
  await show(200);

  // Measured against 400, not against the portrait 900 — which would have read the
  // rotation as a 500px shrink and lifted by nothing.
  expect(lift()).toBe(200);
});
