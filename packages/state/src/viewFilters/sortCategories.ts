import type category from '@beyou/types/category/categoryType';

/** Sort-key options shared by the categories filter bar (web + mobile).
 *  Categories have xp/level but no importance/difficulty (cf. habits). */
export const CATEGORY_SORT_KEYS = [
  'default',
  'name-asc',
  'name-desc',
  'level-desc',
  'level-asc',
  'xp-desc',
  'xp-asc',
  'created-desc',
  'created-asc',
] as const;

export type CategorySortKey = (typeof CATEGORY_SORT_KEYS)[number];

const num = (a = 0, b = 0) => a - b;
const str = (a = '', b = '') => a.localeCompare(b, undefined, { sensitivity: 'base' });
const ts = (v?: Date | string | null): number => {
  if (!v) return 0;
  const time = (v instanceof Date ? v : new Date(v)).getTime();
  return Number.isNaN(time) ? 0 : time;
};

/**
 * Pure category sort mirroring the web categories page. Returns a new array
 * (never mutates). Unknown keys (incl. "default") preserve the input order.
 */
export function sortCategories(categories: category[], sortBy: string): category[] {
  const out = [...categories];
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
    case 'created-desc':
      return out.sort((a, b) => num(ts(b.createdAt), ts(a.createdAt)));
    case 'created-asc':
      return out.sort((a, b) => num(ts(a.createdAt), ts(b.createdAt)));
    default:
      return out;
  }
}
