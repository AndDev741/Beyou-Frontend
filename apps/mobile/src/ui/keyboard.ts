import { Platform } from 'react-native';

/**
 * Who moves the content out of the keyboard's way, for a view inside the app's own
 * window.
 *
 * On Android the app runs with `softwareKeyboardLayoutMode: "pan"` (app.json), so the
 * OS slides the whole window up on its own. Panning shifts what is drawn without
 * changing any layout coordinate, so a `KeyboardAvoidingView` measuring itself still
 * sees a frame reaching the bottom of the screen and adds the keyboard's height a
 * second time. The sheet then sits too high, and when the keyboard closes the padding
 * settles late and leaves a gap showing the screen behind it. Handing Android
 * `undefined` makes the view a passthrough and leaves the panning to the OS.
 *
 * iOS does not pan, so it keeps the padding.
 *
 * This is the WRONG choice inside a Modal. See {@link modalKeyboardAvoidingBehavior}.
 */
export function keyboardAvoidingBehavior(os: string = Platform.OS): 'padding' | undefined {
  return os === 'ios' ? 'padding' : undefined;
}

/**
 * The same question, for a view inside a `Modal` — where the answer is the opposite on
 * Android, and the app had it backwards.
 *
 * A Modal is its own window, and `softwareKeyboardLayoutMode` applies to the activity,
 * never to it. React Native gives that window
 * `SOFT_INPUT_ADJUST_RESIZE` unconditionally (`ReactModalHostView.kt`), so a modal has
 * never panned. It used to resize instead, which is why the passthrough looked correct:
 * the window shrank, the sheet came with it, nothing more was needed.
 *
 * Android 15 ended that. Under the edge-to-edge layout that Expo SDK 54+ enforces,
 * `SOFT_INPUT_ADJUST_RESIZE` is ignored — the window keeps its full height and the
 * keyboard simply draws over it. With the passthrough there was then nothing left doing
 * the work at all, and the composer at the bottom of the agent chat sat underneath the
 * keyboard: you could type and not see a word of it.
 *
 * `padding` is safe on every version rather than only the broken one, because
 * `KeyboardAvoidingView` measures rather than assumes. It computes
 * `frame.y + frame.height - keyboardScreenY`, clamped at zero. On a window that did
 * resize, the frame already ends where the keyboard begins and that arithmetic is zero —
 * no double compensation. On a window that did not, it comes out as exactly the
 * keyboard's height. The measurement is only meaningful because a Modal's
 * KeyboardAvoidingView is the root of its own window, so its layout coordinates and the
 * keyboard's screen coordinates share an origin.
 */
export function modalKeyboardAvoidingBehavior(): 'padding' {
  return 'padding';
}
