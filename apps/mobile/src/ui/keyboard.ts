import { Platform } from 'react-native';

/**
 * Who moves the content out of the keyboard's way.
 *
 * On Android the app runs with `softwareKeyboardLayoutMode: "pan"` (app.json), so
 * the OS pans the whole window up on its own. A `KeyboardAvoidingView` with
 * `behavior="padding"` on top of that compensates for the same keyboard a second
 * time, and when the keyboard closes the padding settles late: the sheet is left
 * hanging with a gap at the bottom that shows the screen behind it. Handing
 * Android `undefined` makes the view a plain passthrough and leaves the panning to
 * the OS.
 *
 * iOS does not pan, so it keeps the padding.
 */
export function keyboardAvoidingBehavior(os: string = Platform.OS): 'padding' | undefined {
  return os === 'ios' ? 'padding' : undefined;
}
