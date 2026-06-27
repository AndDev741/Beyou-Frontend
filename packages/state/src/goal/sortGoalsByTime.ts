import type { goal } from '@beyou/types/goals/goalType';

export type SortedGoals = {
  past: goal[];
  thisWeek: goal[];
  thisMonth: goal[];
  thisYear: goal[];
  beyond: goal[];
};

const startOfWeekMonday = (now: Date): Date => {
  const d = new Date(now);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // back to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Bucket goals by their end date relative to now: past / this week / this month /
 * this year / beyond. Pure + dependency-free (mirrors the web's date-fns version;
 * week starts Monday). Each goal lands in the first matching (narrowest) bucket.
 */
export function sortGoalsByTime(goals: goal[]): SortedGoals {
  const now = new Date();
  const weekStart = startOfWeekMonday(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

  const sorted: SortedGoals = { past: [], thisWeek: [], thisMonth: [], thisYear: [], beyond: [] };

  for (const g of goals) {
    const end = g.endDate instanceof Date ? g.endDate : new Date(g.endDate);
    if (Number.isNaN(end.getTime())) continue;
    if (end < weekStart) sorted.past.push(g);
    else if (end <= weekEnd) sorted.thisWeek.push(g);
    else if (end <= monthEnd) sorted.thisMonth.push(g);
    else if (end <= yearEnd) sorted.thisYear.push(g);
    else sorted.beyond.push(g);
  }

  return sorted;
}
