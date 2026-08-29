import { isOvernightRange } from '@beyou/validation';
import { MINUTES_PER_DAY, toMinutes } from '../routine/minutes';
import { isFocusItemOpen, type FocusItem } from './focusItems';

/**
 * Why the resolver picked the item it picked.
 *
 * The reason travels with the index because the screen says different things about each case,
 * and because it is the honest answer to "did the clock choose this, or did we?".
 */
export type FocusStartReason =
  /** A timed window contains the clock right now. */
  | 'now'
  /** Nothing is running; this is the next thing with a window, and it has not started. */
  | 'next'
  /** Nothing here has times, so this is simply the first thing still open. */
  | 'order'
  /** Every window has already passed. This is the last one still open. */
  | 'late'
  /** Everything is checked or skipped. The day is done. */
  | 'complete';

export type FocusStart = {
  /** Index into the array handed in. -1 when there is nothing to point at. */
  index: number;
  reason: FocusStartReason;
};

const NOTHING: FocusStart = { index: -1, reason: 'complete' };

/**
 * Where the ultrafoco opens.
 *
 * **It chooses the STARTING item and nothing else.** The clock suggests, it never commands: once
 * the person moves by hand the selection is theirs, and this function is not consulted again for
 * that visit. That rule lives in the slice, not here, but it is the reason this returns a single
 * index instead of exposing a "current item" the UI would be tempted to keep re-reading.
 *
 * Untimed items are the base case, not a fallback. A LIST routine reaches the `order` branch and
 * behaves correctly with no special casing, and so does a DAILY routine nobody finished
 * scheduling.
 *
 * @param items    from `getFocusItems`, in card order
 * @param nowMinutes minutes since the user's local midnight
 * @param date     the user's local day, for reading the checks
 */
export function resolveFocusStart(
  items: FocusItem[],
  nowMinutes: number,
  date: string,
): FocusStart {
  if (items.length === 0) return { index: -1, reason: 'complete' };

  const open = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => isFocusItemOpen(item, date));

  if (open.length === 0) return NOTHING;

  // Untimed first, deliberately. If nothing open has a window there is no clock question to
  // answer, and this is the whole of the LIST behaviour.
  const timed = open.filter(({ item }) => item.startTime);
  if (timed.length === 0) return { index: open[0].index, reason: 'order' };

  const running = timed.find(({ item }) => containsNow(item, nowMinutes));
  if (running) return { index: running.index, reason: 'now' };

  // A gap. The next window that has not opened yet, by clock order rather than card order:
  // "what is next" is a question about time, and only here does time outrank the card.
  const upcoming = timed
    .filter(({ item }) => toMinutes(item.startTime!) > nowMinutes)
    .sort((a, b) => toMinutes(a.item.startTime!) - toMinutes(b.item.startTime!));
  if (upcoming.length > 0) return { index: upcoming[0].index, reason: 'next' };

  // Every window has passed. Land on the LATEST one still open, so somebody opening the app
  // at eleven at night sees this evening and not this morning. By clock and not by card
  // order, for the same reason as the gap above: "which one is most recent" is a question
  // about time, and card order only usually agrees with it.
  const latest = [...timed].sort(
    (a, b) => toMinutes(a.item.startTime!) - toMinutes(b.item.startTime!),
  );
  return { index: latest[latest.length - 1].index, reason: 'late' };
}

/**
 * Whether the clock is inside this item's window.
 *
 * End-exclusive, so two back-to-back items never both claim the same minute. An item with a
 * start and no end owns just its starting minute, which reads oddly stated like that but is
 * right: without an end there is no window to be inside, and the alternative (owning
 * everything until the next item) would make an unscheduled afternoon belong to breakfast.
 *
 * Overnight is not a special case bolted on. `isOvernightRange` is the same helper the routine
 * validation and `suggestSlots` use, so a window from 23:00 to 01:00 means the same thing in
 * all three places.
 */
function containsNow(item: FocusItem, nowMinutes: number): boolean {
  const start = toMinutes(item.startTime!);
  if (Number.isNaN(start)) return false;
  if (!item.endTime) return nowMinutes === start;

  const end = toMinutes(item.endTime);
  if (Number.isNaN(end)) return nowMinutes === start;

  if (isOvernightRange(item.startTime, item.endTime)) {
    // Two arms around midnight: tonight's tail and this morning's head.
    return nowMinutes >= start || nowMinutes < end;
  }
  if (start === end) return nowMinutes === start;
  return nowMinutes >= start && nowMinutes < end;
}

/** Minutes since midnight for a Date, for the callers that hold one. */
export const minutesOfDay = (at: Date): number =>
  ((at.getHours() * 60 + at.getMinutes()) % MINUTES_PER_DAY + MINUTES_PER_DAY) % MINUTES_PER_DAY;
