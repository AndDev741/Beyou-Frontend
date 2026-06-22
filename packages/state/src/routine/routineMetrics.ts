import type { Routine } from '@beyou/types/routine/routine';
import type { RoutineSection, check } from '@beyou/types/routine/routineSection';

export type RoutineStats = { totalItems: number; completedItems: number; xpEarned: number };

const completedChecks = (checks: check[] | undefined, date: string): check[] =>
  (checks ?? []).filter((c) => (date ? c?.checkDate === date && Boolean(c?.checked) : Boolean(c?.checked)));

function sectionStats(section: RoutineSection, date: string): RoutineStats {
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
      const st = sectionStats(s, date);
      return { totalItems: acc.totalItems + st.totalItems, completedItems: acc.completedItems + st.completedItems, xpEarned: acc.xpEarned + st.xpEarned };
    },
    { totalItems: 0, completedItems: 0, xpEarned: 0 },
  );
}

export function countItemsInRoutine(routine: Routine): number {
  return (routine.routineSections ?? []).reduce((n, s) => n + (s.taskGroup?.length ?? 0) + (s.habitGroup?.length ?? 0), 0);
}
