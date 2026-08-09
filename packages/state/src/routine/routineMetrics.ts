/**
 * Routine tallies and time formatting, shared by web and mobile.
 *
 * Both apps carried a byte-identical copy of the formatting half, with a
 * comment admitting "change here, change there". This is the one home.
 */
import type { Routine } from '@beyou/types/routine/routine';
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
