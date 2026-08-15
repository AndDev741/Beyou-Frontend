import { keyboardAvoidingBehavior, modalKeyboardAvoidingBehavior } from '../src/ui/keyboard';

/**
 * Two windows, two answers, and the app used the screen's answer inside its modals.
 *
 * A view in the app's own window is already moved by Android, which runs in `pan`
 * (app.json). Panning does not change layout coordinates, so a KeyboardAvoidingView
 * measuring itself would add the keyboard's height on top of a window that had already
 * moved by it.
 *
 * A Modal is a different window and was never panned: React Native hands it
 * SOFT_INPUT_ADJUST_RESIZE outright. That used to resize it, which made the passthrough
 * look right by accident. Android 15 ignores that flag under the edge-to-edge layout
 * Expo SDK 54+ enforces, so nothing moved at all and the agent chat's composer sat
 * under the keyboard while you typed into it.
 */
describe('keyboardAvoidingBehavior, for the app window', () => {
  it('leaves the panning to Android', () => {
    expect(keyboardAvoidingBehavior('android')).toBeUndefined();
  });

  it('keeps padding on iOS, which does not pan', () => {
    expect(keyboardAvoidingBehavior('ios')).toBe('padding');
  });
});

describe('modalKeyboardAvoidingBehavior, for a modal window', () => {
  /**
   * Padding on both, and deliberately not a platform check. KeyboardAvoidingView
   * measures instead of assuming: it takes `frame.y + frame.height - keyboardScreenY`
   * and clamps at zero, so on a window that did resize the frame already ends at the
   * keyboard and the result is nothing. The same value is therefore right whether or
   * not the Android version still honours the resize.
   */
  it('always compensates, because a modal is never the panned window', () => {
    expect(modalKeyboardAvoidingBehavior()).toBe('padding');
  });

  it('does not answer the app window question', () => {
    expect(modalKeyboardAvoidingBehavior()).not.toBe(keyboardAvoidingBehavior('android'));
  });
});
