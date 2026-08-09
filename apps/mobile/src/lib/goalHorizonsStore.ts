import * as SecureStore from 'expo-secure-store';

/**
 * Which goal horizons stay visible on the dashboard. Same contract as the web's
 * `beyou-goal-horizons`: someone who only cares about this week should not have
 * to re-filter every day.
 *
 * `null` means "never chose"; `[]` means "chose to hide them all". Collapsing
 * the second into the first brought the defaults back on the next launch and
 * undid the choice.
 */
const KEY = 'beyou.goalHorizons';

export async function loadGoalHorizons(): Promise<string[] | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : null;
  } catch {
    return null;
  }
}

/** Best-effort: with no storage the choice lasts only for this session. */
export async function saveGoalHorizons(keys: string[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(keys));
  } catch {
    // swallow — a screen preference is not critical data
  }
}
