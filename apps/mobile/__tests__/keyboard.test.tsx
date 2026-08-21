/**
 * Lifting a modal off the keyboard, and putting it back down.
 *
 * Three ways this has shipped broken, all pinned here.
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
 * Then the lift was short: `endCoordinates.height` stops at the navigation bar the
 * keyboard is drawn on top of, so a full-bleed container lifted by it kept a navigation
 * bar's worth of itself under the keyboard. The forms' pinned footer came out sliced in
 * half.
 *
 * So the arithmetic reads the keyboard's TOP against the container's own height, and
 * hide is a hard zero rather than a subtraction.
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

/**
 * `screenY` is the keyboard's top edge, which is what the hook reads. `height` rides
 * along because the real event carries both, and because it is deliberately NOT the
 * number in play: on the device it is one navigation bar smaller than the gap the
 * keyboard actually covers.
 */
const show = async (screenY: number, height = 0) => {
  await act(async () => {
    listeners.keyboardDidShow?.({ endCoordinates: { screenY, height } });
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

it('lifts to the top edge of the keyboard when the window does not move', async () => {
  await mount();
  await measure(900);
  expect(lift()).toBe(0);

  await show(600);

  // Android 15 under edge-to-edge: the window keeps its height and the keyboard draws
  // over it, so everything below the keyboard's top is ours to give up.
  expect(lift()).toBe(300);
});

/**
 * The whole reason the arithmetic changed, in a Pixel 7's real numbers: the window is
 * 914.29 tall, the keyboard's top sits at 577.90, and the keyboard REPORTS a height of
 * 312.38, because that stops at the navigation bar it is drawn on top of. The gap to
 * cover is 336.38. Lifting by the reported height leaves the bottom 24 of the container
 * under the keyboard, which is how the forms' footer came out sliced in half.
 */
it('lifts past the navigation bar the keyboard is drawn on top of', async () => {
  await mount();
  await measure(914.2857142857143);

  await show(577.90478515625, 312.3809509277344);

  expect(lift()).toBeCloseTo(336.38, 2);
  // Not the reported height.
  expect(lift()).not.toBeCloseTo(312.38, 2);
});

it('returns to exactly zero when the keyboard hides', async () => {
  await mount();
  await measure(900);
  await show(600);

  await hide();

  // Zero, not "smaller than before". The old bug left a residue one navigation bar
  // tall, and a residue is exactly what the screen behind shows through.
  expect(lift()).toBe(0);
});

it('lifts by nothing when the window already gave up the space', async () => {
  await mount();
  await measure(900);

  await show(600);
  // Older Android still honours SOFT_INPUT_ADJUST_RESIZE, so the modal's own window
  // shrinks to meet the keyboard and the next layout arrives smaller. Nothing of it is
  // covered any more, and no baseline was needed to work that out.
  await measure(600);

  expect(lift()).toBe(0);
});

it('lifts by the remainder when the window gave up only part of it', async () => {
  await mount();
  await measure(900);

  await show(600);
  await measure(800);

  expect(lift()).toBe(200);
});

it('lifts the full amount again after a window that shrank and came back', async () => {
  await mount();
  await measure(900);
  await show(600);
  await measure(600);
  await hide();

  // Back to full height with nothing covering it, so the next keyboard has to lift the
  // full amount. The shrunken 600 is not remembered anywhere to be mistaken for the
  // window's normal size.
  await measure(900);
  await show(600);

  expect(lift()).toBe(300);
});

it('survives a rotation without carrying the old orientation into the sum', async () => {
  await mount();
  await measure(900);
  await hide();

  // Landscape: shorter, and nothing covering it.
  await measure(400);
  await show(200);

  // Read off the landscape height, not against the portrait 900 — which an earlier
  // version compared against and read as a 500 shrink, lifting by nothing.
  expect(lift()).toBe(200);
});
