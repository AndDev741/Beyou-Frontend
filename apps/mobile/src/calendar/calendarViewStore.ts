import * as SecureStore from 'expo-secure-store';
import type { CalendarView } from '@beyou/state';

/**
 * The last calendar view used on this device, month or week (R14). Same storage as the other
 * small screen preferences (`goalHorizonsStore`, `dismissedStore`): the secure store that is
 * already installed, rather than a new native dependency for one word.
 */
const KEY = 'beyou.calendarView';

export async function loadCalendarView(): Promise<CalendarView | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw === 'month' || raw === 'week' ? raw : null;
  } catch {
    return null;
  }
}

/** Best-effort: with no storage the choice lasts only for this session. */
export async function saveCalendarView(view: CalendarView): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, view);
  } catch {
    // swallow: a screen preference is not critical data
  }
}
