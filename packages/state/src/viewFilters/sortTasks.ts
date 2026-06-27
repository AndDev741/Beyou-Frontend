import type { task } from '@beyou/types/tasks/taskType';

/** Sort-key options shared by the tasks filter bar (web + mobile).
 *  Tasks have no level/xp, so those keys are absent (cf. HABIT_SORT_KEYS). */
export const TASK_SORT_KEYS = [
  'default',
  'name-asc',
  'name-desc',
  'importance-desc',
  'importance-asc',
  'difficulty-desc',
  'difficulty-asc',
  'created-desc',
  'created-asc',
] as const;

export type TaskSortKey = (typeof TASK_SORT_KEYS)[number];

const num = (a = 0, b = 0) => a - b;
const str = (a = '', b = '') => a.localeCompare(b, undefined, { sensitivity: 'base' });
const ts = (v?: Date | string | null): number => {
  if (!v) return 0;
  const time = (v instanceof Date ? v : new Date(v)).getTime();
  return Number.isNaN(time) ? 0 : time;
};

/**
 * Pure task sort mirroring the web tasks page. Returns a new array (never
 * mutates). Unknown keys (incl. "default") preserve the input order.
 */
export function sortTasks(tasks: task[], sortBy: string): task[] {
  const out = [...tasks];
  switch (sortBy) {
    case 'name-asc':
      return out.sort((a, b) => str(a.name, b.name));
    case 'name-desc':
      return out.sort((a, b) => str(b.name, a.name));
    case 'importance-desc':
      return out.sort((a, b) => num(b.importance, a.importance));
    case 'importance-asc':
      return out.sort((a, b) => num(a.importance, b.importance));
    case 'difficulty-desc':
      return out.sort((a, b) => num(b.difficulty, a.difficulty));
    case 'difficulty-asc':
      return out.sort((a, b) => num(a.difficulty, b.difficulty));
    case 'created-desc':
      return out.sort((a, b) => num(ts(b.createdAt), ts(a.createdAt)));
    case 'created-asc':
      return out.sort((a, b) => num(ts(a.createdAt), ts(b.createdAt)));
    default:
      return out;
  }
}
