import { parseISO, isBefore, isAfter, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { goal } from '../../../types/goals/goalType';

export type SortedGoals = {
  past: goal[];
  thisWeek: goal[];
  thisMonth: goal[];
  thisYear: goal[];
  beyond: goal[];
};

export function sortGoalsByTime(goals: goal[]): SortedGoals {
  const now = new Date();

  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Segunda-feira
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);

  const sorted: SortedGoals = {
    past: [],
    thisWeek: [],
    thisMonth: [],
    thisYear: [],
    beyond: [],
  };

  for (const goal of goals) {
    const end = goal.endDate;

    if (isBefore(end, weekStart)) {
      sorted.past.push(goal);
    } else if (isWithinInterval(end, { start: weekStart, end: weekEnd })) {
      sorted.thisWeek.push(goal);
    } else if (isWithinInterval(end, { start: monthStart, end: monthEnd })) {
      sorted.thisMonth.push(goal);
    } else if (isWithinInterval(end, { start: yearStart, end: yearEnd })) {
      sorted.thisYear.push(goal);
    } else if (isAfter(end, yearEnd)) {
      sorted.beyond.push(goal);
    }
  }

  return sorted;
}
