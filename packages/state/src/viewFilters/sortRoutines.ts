import type { Routine } from '@beyou/types/routine/routine';

/** Sort-key options shared by the routines filter bar (web + mobile). */
export const ROUTINE_SORT_KEYS = [
  'default', 'name-asc', 'name-desc', 'level-desc', 'level-asc', 'xp-desc', 'xp-asc',
] as const;
export type RoutineSortKey = (typeof ROUTINE_SORT_KEYS)[number];

const num = (a = 0, b = 0) => a - b;
const str = (a = '', b = '') => a.localeCompare(b, undefined, { sensitivity: 'base' });

/**
 * Pure routine sort mirroring the sortHabits pattern. Returns a new array (never
 * mutates). Unknown keys (incl. "default") preserve the input order.
 */
export function sortRoutines(routines: Routine[], sortBy: string): Routine[] {
  const out = [...routines];
  switch (sortBy) {
    case 'name-asc': return out.sort((a, b) => str(a.name, b.name));
    case 'name-desc': return out.sort((a, b) => str(b.name, a.name));
    case 'level-desc': return out.sort((a, b) => num(b.level, a.level));
    case 'level-asc': return out.sort((a, b) => num(a.level, b.level));
    case 'xp-desc': return out.sort((a, b) => num(b.xp, a.xp));
    case 'xp-asc': return out.sort((a, b) => num(a.xp, b.xp));
    default: return out;
  }
}
