import { keyboardAvoidingBehavior } from '../src/ui/keyboard';

/**
 * The agent chat and every bottom sheet sit inside a KeyboardAvoidingView. On
 * Android the window already pans (app.json `softwareKeyboardLayoutMode: "pan"`),
 * so padding on top of it compensated twice and left a gap under the sheet once
 * the keyboard closed.
 */
describe('keyboardAvoidingBehavior', () => {
  it('leaves the panning to Android', () => {
    expect(keyboardAvoidingBehavior('android')).toBeUndefined();
  });

  it('keeps padding on iOS, which does not pan', () => {
    expect(keyboardAvoidingBehavior('ios')).toBe('padding');
  });
});
