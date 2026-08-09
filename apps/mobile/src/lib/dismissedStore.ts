import * as SecureStore from 'expo-secure-store';

// Same call as viewFiltersStore: reuse the expo-secure-store already installed
// instead of pulling in AsyncStorage (a new native dependency ⇒ a rebuild). The
// value is a one-letter flag per key.
const PREFIX = 'beyou.dismissed.';

/** Reads the dismissal. Best-effort: a failed read counts as "not yet". */
export async function loadDismissed(key: string): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(PREFIX + key)) === '1';
  } catch {
    return false;
  }
}

/** Best-effort: with no storage the invitation returns on the next launch. */
export async function saveDismissed(key: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(PREFIX + key, '1');
  } catch {
    // swallow — a screen preference is not critical data
  }
}
