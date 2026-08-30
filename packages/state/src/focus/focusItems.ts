import type { Routine } from '@beyou/types/routine/routine';
import type { check } from '@beyou/types/routine/routineSection';
import { getListItems, isListRoutine } from '../routine/routineMetrics';

/**
 * One thing to do, from either shape of routine.
 *
 * This is the list the whole Focus Mode reads. Nothing downstream walks sections again: the
 * ultrafoco is an index into this array, the pomodoro reads its window, and the check call
 * takes its `groupId`.
 */
export type FocusItem = {
  /**
   * The item group's id. What `POST /routine/check` and `/routine/skip` take, and the only
   * field the backend actually needs to record a check.
   */
  groupId: string;
  type: 'habit' | 'task';
  /** The habit's or task's own id, for resolving the name and icon from those slices. */
  itemId: string;
  /** The section this came from. Empty string for a LIST routine, which has no real ones. */
  sectionName: string;
  /** Absent on a LIST routine, and absent on a DAILY item nobody gave a time to. */
  startTime?: string;
  endTime?: string;
  checks?: check[];
};

/**
 * Today's items, in the order the person sees them on the routine card.
 *
 * **LIST is the base case and DAILY is the decorated one.** A list has no times at all, so its
 * focus screen is permanently "pick the next thing", which is exactly what the freedom rule
 * asks for on both shapes. Written the other way round, with the clock driving and the list
 * bolted on, every LIST path becomes an `if (!startTime)` branch and the rule fights the code.
 *
 * The order deliberately mirrors what the card renders rather than being a cleverer global
 * sort: sections in array order, items by start time inside each one. A routine with
 * overlapping sections would sort differently under a global sort, and then the focus screen's
 * "next" would disagree with the list the person just looked at.
 */
/**
 * The entry the person has open in Focus Mode, or undefined when nothing is selected.
 *
 * Both clients send this with an agent message so a tool can be told which entry "this" means,
 * and the answer has to be the same one on both. `selectedIndex` is an index into
 * `getFocusItems`, so nothing else can resolve it: reading the routine directly would give a
 * different item the moment a section has more than one thing in it.
 */
export function selectedFocusGroupId(
  routine: Routine | null | undefined,
  selectedIndex: number | null | undefined,
): string | undefined {
  if (selectedIndex == null || selectedIndex < 0) return undefined;
  return getFocusItems(routine)[selectedIndex]?.groupId || undefined;
}

export function getFocusItems(routine: Routine | null | undefined): FocusItem[] {
  if (!routine) return [];

  if (isListRoutine(routine)) {
    return getListItems(routine).map((item) => ({
      groupId: item.id,
      type: item.type === 'HABIT' ? 'habit' : 'task',
      itemId: (item.type === 'HABIT' ? item.habitId : item.taskId) ?? '',
      sectionName: '',
      checks: item.checks,
    }));
  }

  const items: FocusItem[] = [];
  for (const section of routine.routineSections ?? []) {
    const inSection: FocusItem[] = [
      ...(section.habitGroup ?? []).map<FocusItem>((group) => ({
        groupId: group.id ?? '',
        type: 'habit',
        itemId: group.habitId,
        sectionName: section.name,
        startTime: group.startTime || undefined,
        endTime: group.endTime || undefined,
        checks: group.habitGroupChecks,
      })),
      ...(section.taskGroup ?? []).map<FocusItem>((group) => ({
        groupId: group.id ?? '',
        type: 'task',
        itemId: group.taskId,
        sectionName: section.name,
        startTime: group.startTime || undefined,
        endTime: group.endTime || undefined,
        checks: group.taskGroupChecks,
      })),
    ];

    // Untimed items sink to the end of their own section instead of jumping to the front,
    // matching how the card already orders a section with a half-filled schedule.
    inSection.sort((a, b) => {
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
      if (a.startTime) return -1;
      if (b.startTime) return 1;
      return 0;
    });
    items.push(...inSection);
  }

  // A group with no id could not be checked anyway: the check endpoint takes the group id,
  // so a row without one is a row the screen would offer and then fail to submit.
  return items.filter((item) => item.groupId !== '');
}

/** Whether this item is done on `date`. */
export const isFocusItemChecked = (item: FocusItem, date: string): boolean =>
  (item.checks ?? []).some((c) => c?.checkDate === date && Boolean(c?.checked));

/** Whether the person deliberately passed on it. */
export const isFocusItemSkipped = (item: FocusItem, date: string): boolean =>
  (item.checks ?? []).some((c) => c?.checkDate === date && Boolean(c?.skipped));

/** Neither checked nor skipped: still open for today. */
export const isFocusItemOpen = (item: FocusItem, date: string): boolean =>
  !isFocusItemChecked(item, date) && !isFocusItemSkipped(item, date);
