/**
 * Routine tallies and time formatting, shared by web and mobile.
 *
 * Both apps carried a byte-identical copy of the formatting half, with a
 * comment admitting "change here, change there". This is the one home.
 */
import type { Routine, RoutineListItem } from '@beyou/types/routine/routine';
import type { RoutineSection, check } from '@beyou/types/routine/routineSection';

export type RoutineStats = { totalItems: number; completedItems: number; xpEarned: number };

/** Same shape; the name both apps used for a single section's tally. */
export type SectionStats = RoutineStats;

/** "7:5" and "07:05" both render as "07:05"; nothing renders as "--:--". */
export const formatTime = (time?: string): string => {
  if (!time) return '--:--';
  const parts = time.split(':');
  return parts.length >= 2 ? `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}` : time;
};

export const formatTimeRange = (start?: string, end?: string): string => {
  if (!start && !end) return '';
  if (start && end) return `${formatTime(start)} - ${formatTime(end)}`;
  return start ? formatTime(start) : formatTime(end);
};

export const getTimeOfDay = (startTime?: string): 'morning' | 'afternoon' | 'evening' | 'night' => {
  const hour = startTime ? Number(startTime.split(':')[0]) : 0;
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

const completedChecks = (checks: check[] | undefined, date: string): check[] =>
  (checks ?? []).filter((c) => (date ? c?.checkDate === date && Boolean(c?.checked) : Boolean(c?.checked)));

export function getSectionStats(section: RoutineSection, date: string): SectionStats {
  let totalItems = 0, completedItems = 0, xpEarned = 0;
  const tally = (checks: check[] | undefined) => {
    totalItems += 1;
    const done = completedChecks(checks, date);
    if (done.length > 0) completedItems += 1;
    done.forEach((c) => { if (typeof c?.xpGenerated === 'number') xpEarned += c.xpGenerated; });
  };
  section.taskGroup?.forEach((g) => tally(g.taskGroupChecks));
  section.habitGroup?.forEach((g) => tally(g.habitGroupChecks));
  return { totalItems, completedItems, xpEarned };
}

export function getRoutineStats(routine: Routine, date: string): RoutineStats {
  return (routine.routineSections ?? []).reduce<RoutineStats>(
    (acc, s) => {
      const st = getSectionStats(s, date);
      return { totalItems: acc.totalItems + st.totalItems, completedItems: acc.completedItems + st.completedItems, xpEarned: acc.xpEarned + st.xpEarned };
    },
    { totalItems: 0, completedItems: 0, xpEarned: 0 },
  );
}

export function countItemsInRoutine(routine: Routine): number {
  return (routine.routineSections ?? []).reduce((n, s) => n + (s.taskGroup?.length ?? 0) + (s.habitGroup?.length ?? 0), 0);
}

/**
 * Whether a routine is the flat checklist kind.
 *
 * The one place the "no type at all means DAILY" rule lives — every routine the backend
 * wrote before the List type existed comes back without the field, and all of them are
 * daily. Lives here rather than in @beyou/types because that package is types-only and the
 * first runtime value in it would turn it into a real module for every consumer.
 *
 * `packages/api/routine/routinePayload.ts` compares inline instead of calling this: @beyou/state
 * depends on @beyou/api, so importing back the other way would be a cycle.
 */
export const isListRoutine = (routine?: Pick<Routine, 'type'> | null): boolean =>
  routine?.type === 'LIST';

/**
 * A LIST routine's entries in the order the user arranged them.
 *
 * Reads `items` when the backend sent it and falls back to walking the single internal
 * section otherwise, which is what a routine cached by an older client looks like after an
 * app update: `routineSections` is populated, `items` is not, and the list would render
 * empty without this.
 */
export function getListItems(routine: Routine): RoutineListItem[] {
  if (!isListRoutine(routine)) return [];
  if (routine.items?.length) {
    return [...routine.items].sort((a, b) => a.orderIndex - b.orderIndex);
  }
  const section = routine.routineSections?.[0];
  if (!section) return [];
  const habits: RoutineListItem[] = (section.habitGroup ?? []).map((g, i) => ({
    id: g.id ?? '',
    type: 'HABIT',
    habitId: g.habitId,
    orderIndex: i,
    checks: g.habitGroupChecks,
  }));
  const tasks: RoutineListItem[] = (section.taskGroup ?? []).map((g, i) => ({
    id: g.id ?? '',
    type: 'TASK',
    taskId: g.taskId,
    orderIndex: habits.length + i,
    checks: g.taskGroupChecks,
  }));
  return [...habits, ...tasks];
}

/** How many of a list's items are done on a given date. */
export function getListStats(routine: Routine, date: string): RoutineStats {
  return getListItems(routine).reduce<RoutineStats>(
    (acc, item) => {
      const done = (item.checks ?? []).filter((c) => c?.checkDate === date && Boolean(c?.checked));
      return {
        totalItems: acc.totalItems + 1,
        completedItems: acc.completedItems + (done.length > 0 ? 1 : 0),
        xpEarned: acc.xpEarned + done.reduce((sum, c) => sum + (c?.xpGenerated ?? 0), 0),
      };
    },
    { totalItems: 0, completedItems: 0, xpEarned: 0 },
  );
}
