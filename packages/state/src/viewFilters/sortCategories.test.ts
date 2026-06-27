import { describe, it, expect } from 'vitest';
import { sortCategories } from './sortCategories';
import type category from '@beyou/types/category/categoryType';

const c = (over: Partial<category>): category =>
  ({ id: '', name: '', description: '', iconId: '', xp: 0, level: 0, nextLevelXp: 0, actualLevelXp: 0,
     createdAt: new Date(0), ...over }) as category;

const a = c({ id: 'a', name: 'Banana', level: 1, xp: 10, createdAt: new Date(1000) });
const b = c({ id: 'b', name: 'apple', level: 5, xp: 90, createdAt: new Date(3000) });
const d = c({ id: 'd', name: 'Cherry', level: 3, xp: 50, createdAt: new Date(2000) });
const list = [a, b, d];

describe('sortCategories', () => {
  it('default / unknown key preserves order and does not mutate', () => {
    const out = sortCategories(list, 'default');
    expect(out.map((x) => x.id)).toEqual(['a', 'b', 'd']);
    expect(out).not.toBe(list);
  });
  it('name-asc is case-insensitive', () => {
    expect(sortCategories(list, 'name-asc').map((x) => x.id)).toEqual(['b', 'a', 'd']); // apple, Banana, Cherry
  });
  it('level-desc', () => {
    expect(sortCategories(list, 'level-desc').map((x) => x.id)).toEqual(['b', 'd', 'a']);
  });
  it('xp-asc', () => {
    expect(sortCategories(list, 'xp-asc').map((x) => x.id)).toEqual(['a', 'd', 'b']);
  });
  it('created-desc (newest first)', () => {
    expect(sortCategories(list, 'created-desc').map((x) => x.id)).toEqual(['b', 'd', 'a']);
  });
});
