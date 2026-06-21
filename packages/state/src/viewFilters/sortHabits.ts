import type { habit } from '@beyou/types/habit/habitType';

/** Sort-key options shared by the habits filter bar (web + mobile). */
export const HABIT_SORT_KEYS = [
  'default',
  'name-asc',
  'name-desc',
  'level-desc',
  'level-asc',
  'xp-desc',
  'xp-asc',
  'importance-desc',
  'importance-asc',
  'difficulty-desc',
  'difficulty-asc',
  'created-desc',
  'created-asc',
] as const;

export type HabitSortKey = (typeof HABIT_SORT_KEYS)[number];

const num = (a = 0, b = 0) => a - b;
const str = (a = '', b = '') => a.localeCompare(b, undefined, { sensitivity: 'base' });
const ts = (v?: Date | string | null): number => {
  if (!v) return 0;
  const time = (v instanceof Date ? v : new Date(v)).getTime();
  return Number.isNaN(time) ? 0 : time;
};

/**
 * Pure habit sort mirroring the web habits page. Returns a new array (never
 * mutates). Unknown keys (incl. "default") preserve the input order.
 */
export function sortHabits(habits: habit[], sortBy: string): habit[] {
  const out = [...habits];
  switch (sortBy) {
    case 'name-asc':
      return out.sort((a, b) => str(a.name, b.name));
    case 'name-desc':
      return out.sort((a, b) => str(b.name, a.name));
    case 'level-desc':
      return out.sort((a, b) => num(b.level, a.level));
    case 'level-asc':
      return out.sort((a, b) => num(a.level, b.level));
    case 'xp-desc':
      return out.sort((a, b) => num(b.xp, a.xp));
    case 'xp-asc':
      return out.sort((a, b) => num(a.xp, b.xp));
    case 'importance-desc':
      return out.sort((a, b) => num(b.importance, a.importance));
    case 'importance-asc':
      return out.sort((a, b) => num(a.importance, b.importance));
    case 'difficulty-desc':
      return out.sort((a, b) => num(b.dificulty, a.dificulty));
    case 'difficulty-asc':
      return out.sort((a, b) => num(a.dificulty, b.dificulty));
    case 'created-desc':
      return out.sort((a, b) => num(ts(b.createdAt), ts(a.createdAt)));
    case 'created-asc':
      return out.sort((a, b) => num(ts(a.createdAt), ts(b.createdAt)));
    default:
      return out;
  }
}
