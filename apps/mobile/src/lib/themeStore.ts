import * as SecureStore from 'expo-secure-store';

// Same store as the view filters and the tutorial phase: already installed, no new native dep.
const KEY = 'beyou.theme';

/**
 * How long the splash waits for the read before giving up on it. SecureStore answers in a few
 * milliseconds; the cap only exists so a stuck keystore can never keep the splash up for good.
 * Giving up costs one launch in the default theme, which is what every launch used to be.
 */
const READ_TIMEOUT_MS = 800;

/**
 * The theme this device last showed, serialized the way the profile stores it.
 *
 * Why the device keeps its own copy: the account's theme only arrives with the profile, two
 * network calls into the launch, and until then the app painted the default. On a phone set to
 * light with an account on dark, that was a light screen flashing to dark on every cold start.
 * Returns null on first launch, on bad data, or when the read is too slow.
 */
export async function loadSavedTheme(): Promise<string | null> {
  const read = SecureStore.getItemAsync(KEY).catch(() => null);
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), READ_TIMEOUT_MS));
  const raw = await Promise.race([read, timeout]);
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

/** Best-effort persist; a failed write only means the next launch opens in the default theme. */
export async function saveTheme(serialized: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, serialized);
  } catch {
    // swallow: this is a launch-time nicety, the profile stays the source of truth
  }
}
