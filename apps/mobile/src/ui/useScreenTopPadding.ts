import { useContext } from 'react';
import { Platform } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

/** What every full screen under the status bar used as its top padding. Kept on Android. */
const ANDROID_TOP = 48;

/**
 * Top padding for a screen that draws under the status bar.
 *
 * The screens were tuned on Android with a flat 48. An iPhone with a Dynamic Island has a
 * top inset of 59 to 62 points, so on iOS the title slid under the clock. iOS gets the real
 * inset plus a little air instead, never less than the old 48; Android keeps exactly 48.
 *
 * Read through the context rather than `useSafeAreaInsets()`, which throws without a
 * provider: screen tests render without one, and they get the old 48.
 */
export function useScreenTopPadding(): number {
  const insets = useContext(SafeAreaInsetsContext);
  if (Platform.OS !== 'ios' || !insets) return ANDROID_TOP;
  return Math.max(ANDROID_TOP, insets.top + 8);
}
