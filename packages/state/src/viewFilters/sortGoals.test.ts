import { describe, it, expect } from 'vitest';
import { sortGoals } from './sortGoals';
import type { goal } from '@beyou/types/goals/goalType';

const g = (over: Partial<goal>): goal =>
  ({ id: '', name: '', iconId: '', targetValue: 10, unit: '', currentValue: 0, complete: false,
     categories: {}, startDate: new Date(0), endDate: new Date(0), xpReward: 0, status: 'NOT_STARTED',
     term: 'SHORT_TERM', ...over }) as goal;

const a = g({ id: 'a', name: 'Banana', xpReward: 10, currentValue: 2, targetValue: 10, startDate: new Date(1000), endDate: new Date(5000) });
const b = g({ id: 'b', name: 'apple', xpReward: 90, currentValue: 9, targetValue: 10, startDate: new Date(3000), endDate: new Date(2000) });
const c = g({ id: 'c', name: 'Cherry', xpReward: 50, currentValue: 5, targetValue: 10, startDate: new Date(2000), endDate: new Date(9000) });
const list = [a, b, c];

describe('sortGoals', () => {
  it('default / unknown key preserves order and does not mutate', () => {
    const out = sortGoals(list, 'default');
    expect(out.map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(out).not.toBe(list);
  });
  it('name-asc is case-insensitive', () => {
    expect(sortGoals(list, 'name-asc').map((x) => x.id)).toEqual(['b', 'a', 'c']); // apple, Banana, Cherry
  });
  it('xp-desc', () => {
    expect(sortGoals(list, 'xp-desc').map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });
  it('progress-desc (currentValue/targetValue)', () => {
    expect(sortGoals(list, 'progress-desc').map((x) => x.id)).toEqual(['b', 'c', 'a']); // .9, .5, .2
  });
  it('end-asc (sooner end date first)', () => {
    expect(sortGoals(list, 'end-asc').map((x) => x.id)).toEqual(['b', 'a', 'c']); // 2000, 5000, 9000
  });
  it('start-desc (newest first)', () => {
    expect(sortGoals(list, 'start-desc').map((x) => x.id)).toEqual(['b', 'c', 'a']); // 3000, 2000, 1000
  });
});
