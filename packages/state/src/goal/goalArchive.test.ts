import { describe, it, expect } from 'vitest';
import type { goal } from '@beyou/types/goals/goalType';
import { activeGoals, applyArchiveResult, archivedGoals, isGoalArchived } from './goalArchive';
import { rootGoals } from './goalTree';

const g = (id: string, over: Partial<goal> = {}): goal =>
  ({ id, name: id, iconId: '', targetValue: 10, unit: '', currentValue: 0, complete: false,
     categories: {}, startDate: new Date(0), endDate: new Date(0), xpReward: 0, status: 'NOT_STARTED',
     term: 'SHORT_TERM', parentId: null, ...over }) as goal;

const stamp = '2026-09-20T08:00:00Z';

describe('goalArchive', () => {
  it('splits the one list into what is active and what was put away', () => {
    const goals = [g('a'), g('b', { archivedAt: stamp }), g('c', { archivedAt: null })];
    expect(activeGoals(goals).map((x) => x.id)).toEqual(['a', 'c']);
    expect(archivedGoals(goals).map((x) => x.id)).toEqual(['b']);
    expect(isGoalArchived(goals[1])).toBe(true);
    // An older client's goal, with no field at all, is active.
    expect(isGoalArchived({ archivedAt: undefined })).toBe(false);
  });

  it('a sub-goal restored on its own, under an archived parent, shows as a top-level goal', () => {
    // No special case needed: the parent is filtered out, and rootGoals already treats a goal
    // whose parent is missing from the list as a root, the same as a deleted parent's children.
    const goals = [g('big', { archivedAt: stamp }), g('small', { parentId: 'big' })];
    expect(rootGoals(activeGoals(goals)).map((x) => x.id)).toEqual(['small']);
  });

  it('patches the list with every goal the server says changed, sub-goals included', () => {
    const goals = [g('big'), g('small', { parentId: 'big' }), g('other')];
    const next = applyArchiveResult(goals, [
      g('big', { archivedAt: stamp }),
      g('small', { parentId: 'big', archivedAt: stamp }),
    ]);
    expect(next.map((x) => x.archivedAt ?? null)).toEqual([stamp, stamp, null]);
    expect(next[2]).toBe(goals[2]);
  });
});
