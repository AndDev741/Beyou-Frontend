import * as SecureStore from 'expo-secure-store';

/**
 * Collapsed sections, per day: { "2026-08-04": ["section-a", "section-b"] }.
 *
 * Same contract as the web's `beyou-routine-collapsed`. Tomorrow the section
 * opens fresh — collapsing is a decision about today, not a lasting preference.
 *
 * Only the day being written survives. The map used to keep every day forever
 * in a single SecureStore value (~2048 byte limit), so after a month or two of
 * use every save started failing, silently and for good.
 */
const KEY = 'beyou.routineCollapsed';

type CollapsedMap = Record<string, string[]>;

async function read(): Promise<CollapsedMap> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as CollapsedMap) : {};
  } catch {
    return {};
  }
}

/** A day's collapsed ids. Best-effort: with no storage, nothing is collapsed. */
export async function loadCollapsedSections(date: string): Promise<string[]> {
  return (await read())[date] ?? [];
}

/** Best-effort: with no storage the choice lasts only for this session. */
export async function saveCollapsedSection(
  date: string,
  sectionId: string,
  collapsed: boolean,
): Promise<void> {
  try {
    const map = await read();
    const list = (map[date] ?? []).filter((id) => id !== sectionId);
    if (collapsed) list.push(sectionId);
    // Prunes as it writes: yesterday's entry has no reader, and the whole map
    // shares one storage value.
    await SecureStore.setItemAsync(KEY, JSON.stringify({ [date]: list }));
  } catch {
    // swallow — a screen preference is not critical data
  }
}
