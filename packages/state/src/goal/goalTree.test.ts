import { describe, it, expect } from 'vitest';
import type { goal } from '@beyou/types/goals/goalType';
import {
  MAX_GOAL_DEPTH,
  allChildrenComplete,
  ancestorsOf,
  buildGoalTree,
  childrenSummary,
  depthOf,
  descendantsOf,
  eligibleParents,
  rootGoals,
  rootsForFilter,
  subtreeHeight,
} from './goalTree';

const g = (id: string, over: Partial<goal> = {}): goal =>
  ({ id, name: id, iconId: '', targetValue: 10, unit: '', currentValue: 0, complete: false,
     categories: {}, startDate: new Date(0), endDate: new Date(0), xpReward: 0, status: 'NOT_STARTED',
     term: 'SHORT_TERM', parentId: null, ...over }) as goal;

// big > medium > small, plus a second root and an orphan pointing at a missing parent.
const big = g('big');
const medium = g('medium', { parentId: 'big', currentValue: 5 });
const small = g('small', { parentId: 'medium', currentValue: 10, complete: true });
const other = g('other');
const orphan = g('orphan', { parentId: 'gone' });
const all = [big, medium, small, other, orphan];

describe('goalTree', () => {
  it('roots are goals without a parent, and an orphaned reference reads as a root', () => {
    expect(rootGoals(all).map((x) => x.id)).toEqual(['big', 'other', 'orphan']);
  });

  it('ancestors walk up nearest first, and depth counts the goal itself', () => {
    expect(ancestorsOf(all, 'small').map((x) => x.id)).toEqual(['medium', 'big']);
    expect(depthOf(all, 'small')).toBe(3);
    expect(depthOf(all, 'big')).toBe(1);
  });

  it('descendants and subtree height', () => {
    expect(descendantsOf(all, 'big').map((x) => x.id)).toEqual(['medium', 'small']);
    expect(subtreeHeight(all, 'big')).toBe(2);
    expect(subtreeHeight(all, 'small')).toBe(0);
  });

  it('a looping chain does not hang', () => {
    const a = g('a', { parentId: 'b' });
    const b = g('b', { parentId: 'a' });
    expect(ancestorsOf([a, b], 'a').map((x) => x.id)).toEqual(['b']);
    expect(descendantsOf([a, b], 'a').map((x) => x.id)).toEqual(['b']);
  });

  it('childrenSummary averages the children own fractions and counts completed ones', () => {
    // medium is at 5/10, so big's summary is one child at 0.5.
    expect(childrenSummary(all, 'big')).toEqual({ total: 1, completed: 0, progress: 0.5 });
    expect(childrenSummary(all, 'medium')).toEqual({ total: 1, completed: 1, progress: 1 });
    expect(childrenSummary(all, 'other')).toEqual({ total: 0, completed: 0, progress: 0 });
  });

  it('allChildrenComplete needs at least one child and every one complete', () => {
    expect(allChildrenComplete(all, 'medium')).toBe(true);
    expect(allChildrenComplete(all, 'big')).toBe(false);
    expect(allChildrenComplete(all, 'other')).toBe(false);
  });

  describe('eligibleParents mirrors the server rules', () => {
    it('a new goal may go under anything that still has room below it', () => {
      // small is already at level 3: nothing fits under it.
      expect(eligibleParents(all).map((x) => x.id)).toEqual(['big', 'medium', 'other', 'orphan']);
    });

    it('never offers the goal itself or its descendants', () => {
      const ids = eligibleParents(all, 'big').map((x) => x.id);
      expect(ids).not.toContain('big');
      expect(ids).not.toContain('medium');
      expect(ids).not.toContain('small');
    });

    it('accounts for what hangs under the goal being moved', () => {
      // big carries two more levels, so it can only go under a root... and even then
      // the chain would be 1 (other) + 1 (big) + 2 (medium, small) = 4 > 3.
      expect(eligibleParents(all, 'big')).toEqual([]);
      // medium carries one level: other (1) + medium (1) + small (1) = 3, fits. Its current
      // parent stays on offer too, so the picker can show where it already is.
      expect(eligibleParents(all, 'medium').map((x) => x.id)).toEqual(['big', 'other', 'orphan']);
      expect(MAX_GOAL_DEPTH).toBe(3);
    });
  });

  it('buildGoalTree nests children under their roots', () => {
    const tree = buildGoalTree(all);
    expect(tree.map((n) => n.goal.id)).toEqual(['big', 'other', 'orphan']);
    expect(tree[0].children[0].goal.id).toBe('medium');
    expect(tree[0].children[0].children[0].goal.id).toBe('small');
  });

  it('rootsForFilter keeps the root of a matching sub-goal and marks it as indirect', () => {
    const { roots, viaDescendantOnly } = rootsForFilter(all, [small, other]);
    expect(roots.map((x) => x.id)).toEqual(['big', 'other']);
    expect([...viaDescendantOnly]).toEqual(['big']);
  });
});
