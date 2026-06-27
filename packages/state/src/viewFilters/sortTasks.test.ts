import { describe, it, expect } from 'vitest';
import { sortTasks } from './sortTasks';
import type { task } from '@beyou/types/tasks/taskType';

const t = (over: Partial<task>): task =>
  ({ id: '', name: '', iconId: '', oneTimeTask: false, importance: 0, difficulty: 0,
     markedToDelete: null as never, createdAt: new Date(0), updatedAt: new Date(0), ...over }) as task;

const a = t({ id: 'a', name: 'Banana', importance: 1, difficulty: 3, createdAt: new Date(1000) });
const b = t({ id: 'b', name: 'apple', importance: 5, difficulty: 1, createdAt: new Date(3000) });
const c = t({ id: 'c', name: 'Cherry', importance: 3, difficulty: 5, createdAt: new Date(2000) });
const list = [a, b, c];

describe('sortTasks', () => {
  it('default / unknown key preserves order and does not mutate', () => {
    const out = sortTasks(list, 'default');
    expect(out.map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(out).not.toBe(list);
  });
  it('name-asc is case-insensitive', () => {
    expect(sortTasks(list, 'name-asc').map((x) => x.id)).toEqual(['b', 'a', 'c']); // apple, Banana, Cherry
  });
  it('importance-desc', () => {
    expect(sortTasks(list, 'importance-desc').map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });
  it('difficulty-asc', () => {
    expect(sortTasks(list, 'difficulty-asc').map((x) => x.id)).toEqual(['b', 'a', 'c']);
  });
  it('created-desc (newest first)', () => {
    expect(sortTasks(list, 'created-desc').map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });
});
