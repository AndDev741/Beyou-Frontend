import * as SecureStore from 'expo-secure-store';
import type { RootState } from '../store';

// ponytail: reuse the already-installed expo-secure-store instead of pulling in
// AsyncStorage (no new native dep → no app rebuild). The blob is 5 short strings,
// far under SecureStore's per-item limit.
const KEY = 'beyou.viewFilters';

type ViewFilters = RootState['viewFilters'];

/** Reads the saved per-list sort prefs. Returns null on first launch or bad data. */
export async function loadViewFilters(): Promise<Partial<ViewFilters> | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/** Best-effort persist; a failed write just means the sort resets next launch. */
export async function saveViewFilters(filters: ViewFilters): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(filters));
  } catch {
    // swallow — persistence is non-critical UI state
  }
}
