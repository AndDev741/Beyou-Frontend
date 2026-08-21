import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, type LayoutChangeEvent } from 'react-native';

/**
 * How far a modal has to lift so the keyboard stops covering it.
 *
 * Four attempts got here, and the three before it were each wrong in a way worth
 * writing down, because every one of them looked right on some device.
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
 * The third was `endCoordinates.height`, minus whatever the view's own layout said the
 * window had already given up. It avoided screen coordinates entirely, and it was
 * short. On a Pixel 7 the numbers are: window 914.29, keyboard `height` 312.38, keyboard
 * `screenY` 577.90. The keyboard's top is 336.38 above the bottom of the window, but its
 * reported HEIGHT stops at the navigation bar it is drawn on top of, so a full-bleed
 * container lifted by 312.38 still had a navigation bar's worth of itself underneath the
 * keyboard. Invisible where the covered strip was padding or scrollable, and not
 * invisible at all in the forms, whose footer is pinned to the bottom: Cancel and Save
 * came out sliced in half by the keyboard's top edge.
 *
 * So: the keyboard's TOP, in screen coordinates, against the container's own measured
 * height.
 *
 * - `endCoordinates.screenY` on show, and nothing at all on hide. The resting frame
 *   that produced the second attempt's residue is never read, because a closed keyboard
 *   is not arithmetic, it is a hard zero.
 * - The container's height from its own `onLayout`. On a window that still honours the
 *   resize, that height shrinks to meet the keyboard's top and the lift comes out at
 *   zero on its own, so there is nothing to keep a baseline for and nothing to
 *   re-baseline after a rotation.
 *
 * Attach `onLayout` to the view you apply `lift` to as bottom padding: it is the
 * measurement, not a nicety, and without it there is no lift. Padding does not change
 * that view's own measured height, so this does not feed back on itself. Give it the
 * view that spans the window — the root inside the Modal — since the arithmetic reads
 * that view's bottom edge as the bottom of the screen.
 */
export function useKeyboardLift(): {
  lift: number;
  onLayout: (event: LayoutChangeEvent) => void;
} {
  const [lift, setLift] = useState(0);
  /** The keyboard's top edge in screen coordinates, or null while it is down. */
  const keyboardTop = useRef<number | null>(null);
  const currentHeight = useRef(0);

  const recompute = useCallback(() => {
    if (keyboardTop.current === null) {
      setLift(0);
      return;
    }
    setLift(Math.max(0, currentHeight.current - keyboardTop.current));
  }, []);

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardTop.current = event.endCoordinates.screenY;
      recompute();
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop.current = null;
      recompute();
    });
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, [recompute]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      currentHeight.current = event.nativeEvent.layout.height;
      recompute();
    },
    [recompute],
  );

  return { lift, onLayout };
}
