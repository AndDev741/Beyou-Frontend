import type { goal } from '@beyou/types/goals/goalType';

/** Sort-key options shared by the goals filter bar (web + mobile). */
export const GOAL_SORT_KEYS = [
  'default',
  'name-asc',
  'name-desc',
  'xp-desc',
  'xp-asc',
  'progress-desc',
  'progress-asc',
  'end-asc',
  'end-desc',
  'start-desc',
  'start-asc',
] as const;

export type GoalSortKey = (typeof GOAL_SORT_KEYS)[number];

const num = (a = 0, b = 0) => a - b;
const str = (a = '', b = '') => a.localeCompare(b, undefined, { sensitivity: 'base' });
const ts = (v?: Date | string | null): number => {
  if (!v) return 0;
  const time = (v instanceof Date ? v : new Date(v)).getTime();
  return Number.isNaN(time) ? 0 : time;
};
const progress = (g: goal) => (g.targetValue ? g.currentValue / g.targetValue : 0);

/**
 * Pure goal sort mirroring the web goals page. Returns a new array (never
 * mutates). Unknown keys (incl. "default") preserve the input order.
 */
export function sortGoals(goals: goal[], sortBy: string): goal[] {
  const out = [...goals];
  switch (sortBy) {
    case 'name-asc':
      return out.sort((a, b) => str(a.name, b.name));
    case 'name-desc':
      return out.sort((a, b) => str(b.name, a.name));
    case 'xp-desc':
      return out.sort((a, b) => num(b.xpReward, a.xpReward));
    case 'xp-asc':
      return out.sort((a, b) => num(a.xpReward, b.xpReward));
    case 'progress-desc':
      return out.sort((a, b) => num(progress(b), progress(a)));
    case 'progress-asc':
      return out.sort((a, b) => num(progress(a), progress(b)));
    case 'end-asc':
      return out.sort((a, b) => num(ts(a.endDate), ts(b.endDate)));
    case 'end-desc':
      return out.sort((a, b) => num(ts(b.endDate), ts(a.endDate)));
    case 'start-desc':
      return out.sort((a, b) => num(ts(b.startDate), ts(a.startDate)));
    case 'start-asc':
      return out.sort((a, b) => num(ts(a.startDate), ts(b.startDate)));
    default:
      return out;
  }
}
