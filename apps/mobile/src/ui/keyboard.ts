import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, type LayoutChangeEvent } from 'react-native';

/**
 * How far a modal has to lift so the keyboard stops covering it.
 *
 * Three attempts got here, and the two before it were both wrong in ways worth
 * writing down, because each looked right on some devices.
 *
 * `KeyboardAvoidingView` with `behavior={undefined}` on Android was the first. The
 * reasoning was that the OS pans the window (`softwareKeyboardLayoutMode: "pan"` in
 * app.json) so nothing else should. True of the app's own window; a Modal is a
 * different one, and React Native gives it `SOFT_INPUT_ADJUST_RESIZE` outright. That
 * used to resize it, which made doing nothing look correct. Android 15 ignores the flag
 * under the edge-to-edge layout Expo enforces, so the window stopped moving and the
 * agent chat's composer sat under the keyboard while you typed into it.
 *
 * `behavior="padding"` was the second, on the reasoning that KeyboardAvoidingView
 * measures rather than assumes: it computes `frame.y + frame.height - keyboardScreenY`,
 * clamped at zero, so a window that already resized should yield nothing. The lift was
 * right. The RETURN was not — on hide, Android reports the keyboard's resting frame at
 * the top of the navigation bar rather than at the bottom of the screen, so that
 * subtraction leaves a residue exactly one navigation bar tall. Open the keyboard once
 * and the sheet stayed lifted off the bottom for the rest of its life, with the screen
 * behind showing through the gap.
 *
 * So: no screen coordinates at all. Two numbers that are unambiguous on every version.
 *
 * - The keyboard's own height, from the event, and a hard zero when it hides. A closed
 *   keyboard is not arithmetic, it is a fact, and this is what makes the residue
 *   impossible.
 * - How much the window already gave up, from the view's own layout: the height it has
 *   with no keyboard, minus the height it has now. On a window that still honours the
 *   resize that difference is the keyboard's height and the lift comes out at zero, so
 *   there is no double compensation on older Android either.
 *
 * The baseline is re-taken whenever the keyboard is down, so a rotation replaces it
 * instead of leaving a portrait measurement to be compared against a landscape one.
 *
 * Attach `onLayout` to the view you apply `lift` to as bottom padding. Padding does not
 * change that view's own measured height, so this does not feed back on itself.
 */
export function useKeyboardLift(): {
  lift: number;
  onLayout: (event: LayoutChangeEvent) => void;
} {
  const [lift, setLift] = useState(0);
  const keyboardHeight = useRef(0);
  const baselineHeight = useRef(0);
  const currentHeight = useRef(0);

  const recompute = useCallback(() => {
    if (keyboardHeight.current === 0) {
      setLift(0);
      return;
    }
    const alreadyGiven = Math.max(0, baselineHeight.current - currentHeight.current);
    setLift(Math.max(0, keyboardHeight.current - alreadyGiven));
  }, []);

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardHeight.current = event.endCoordinates.height;
      recompute();
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => {
      keyboardHeight.current = 0;
      recompute();
    });
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, [recompute]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      currentHeight.current = height;
      // Only while nothing is covering it: a height measured with the keyboard up is
      // the shrunken one, and taking it as the baseline would zero the lift and put
      // the input back under the keyboard.
      if (keyboardHeight.current === 0) {
        baselineHeight.current = height;
      }
      recompute();
    },
    [recompute],
  );

  return { lift, onLayout };
}
