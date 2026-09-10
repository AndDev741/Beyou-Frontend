import { describe, it, expect } from 'vitest';
import type { goal } from '@beyou/types/goals/goalType';
import { orderGoalsForViewer, viewerIndexFor, viewerSlideFor, isGoalViewerSortKey, goalViewerLayoutFrom } from './goalViewer';

const g = (id: string, over: Partial<goal> = {}): goal =>
  ({ id, name: id, iconId: '', targetValue: 10, unit: '', currentValue: 0, complete: false,
     categories: {}, startDate: new Date(0), endDate: new Date(0), xpReward: 0, status: 'NOT_STARTED',
     term: 'SHORT_TERM', ...over }) as goal;

const done = g('done', { status: 'COMPLETED', complete: true, endDate: new Date(1000) });
const soonProgress = g('soonProgress', { status: 'IN_PROGRESS', endDate: new Date(2000), categories: { c1: { name: 'Saúde', iconId: '' } } });
const lateProgress = g('lateProgress', { status: 'IN_PROGRESS', endDate: new Date(9000), categories: { c2: { name: 'Carreira', iconId: '' } } });
const fresh = g('fresh', { status: 'NOT_STARTED', endDate: new Date(500) });
const deck = [done, lateProgress, fresh, soonProgress];

describe('orderGoalsForViewer', () => {
  it('status puts in-progress first, then not started, then completed, by deadline inside each group', () => {
    expect(orderGoalsForViewer(deck, { sortBy: 'status' }).map((x) => x.id))
      .toEqual(['soonProgress', 'lateProgress', 'fresh', 'done']);
  });

  it('category groups alphabetically and sends goals without a category to the end', () => {
    expect(orderGoalsForViewer(deck, { sortBy: 'category' }).map((x) => x.id))
      .toEqual(['lateProgress', 'soonProgress', 'fresh', 'done']);
  });

  it('other keys defer to sortGoals', () => {
    expect(orderGoalsForViewer(deck, { sortBy: 'end-asc' }).map((x) => x.id))
      .toEqual(['fresh', 'done', 'soonProgress', 'lateProgress']);
  });

  it('filters by status and category before ordering', () => {
    expect(orderGoalsForViewer(deck, { sortBy: 'status', status: 'IN_PROGRESS' }).map((x) => x.id))
      .toEqual(['soonProgress', 'lateProgress']);
    expect(orderGoalsForViewer(deck, { sortBy: 'status', categoryId: 'c2' }).map((x) => x.id))
      .toEqual(['lateProgress']);
  });

  it('does not mutate the input', () => {
    const before = deck.map((x) => x.id);
    orderGoalsForViewer(deck, { sortBy: 'status' });
    expect(deck.map((x) => x.id)).toEqual(before);
  });
});

describe('viewerIndexFor', () => {
  it('finds the requested goal and falls back to the first slide', () => {
    expect(viewerIndexFor(deck, 'fresh')).toBe(2);
    expect(viewerIndexFor(deck, 'missing')).toBe(0);
    expect(viewerIndexFor(deck, null)).toBe(0);
  });
});

describe('isGoalViewerSortKey', () => {
  it('accepts the deck keys only', () => {
    expect(isGoalViewerSortKey('status')).toBe(true);
    expect(isGoalViewerSortKey('xp-desc')).toBe(false);
  });
});

describe('grouped layout', () => {
  const parent = g('parent', { status: 'IN_PROGRESS', endDate: new Date(3000) });
  const child = g('child', { status: 'COMPLETED', complete: true, parentId: 'parent', endDate: new Date(100) });
  const grandchild = g('grandchild', { status: 'NOT_STARTED', parentId: 'child' });
  const other = g('other', { status: 'NOT_STARTED', endDate: new Date(4000) });
  const all = [parent, child, grandchild, other];

  it('walks the roots only, keeping every sub-goal off the deck', () => {
    expect(orderGoalsForViewer(all, { sortBy: 'status', layout: 'grouped' }).map((x) => x.id))
      .toEqual(['parent', 'other']);
  });

  it('keeps a root whose sub-goal matched the filter, so the match has a parent to open from', () => {
    expect(orderGoalsForViewer(all, { sortBy: 'status', layout: 'grouped', status: 'COMPLETED' }).map((x) => x.id))
      .toEqual(['parent']);
  });

  it('list is the default and shows every goal as its own slide', () => {
    expect(orderGoalsForViewer(all, { sortBy: 'status' }).map((x) => x.id))
      .toEqual(['parent', 'grandchild', 'other', 'child']);
  });

  it('viewerSlideFor opens a sub-goal on its nearest ancestor slide, and a slide goal on itself', () => {
    const grouped = orderGoalsForViewer(all, { sortBy: 'status', layout: 'grouped' });
    expect(viewerSlideFor(grouped, all, 'parent')).toEqual({ index: 0, openId: null });
    expect(viewerSlideFor(grouped, all, 'child')).toEqual({ index: 0, openId: 'child' });
    expect(viewerSlideFor(grouped, all, 'grandchild')).toEqual({ index: 0, openId: 'grandchild' });
    expect(viewerSlideFor(grouped, all, 'missing')).toEqual({ index: 0, openId: null });
    expect(viewerSlideFor(grouped, all, null)).toEqual({ index: 0, openId: null });
    const list = orderGoalsForViewer(all, { sortBy: 'status', layout: 'list' });
    expect(viewerSlideFor(list, all, 'child')).toEqual({ index: 3, openId: null });
  });

  it('goalViewerLayoutFrom tolerates a stored blob that predates the preference', () => {
    expect(goalViewerLayoutFrom(undefined)).toBe('grouped');
    expect(goalViewerLayoutFrom('nonsense')).toBe('grouped');
    expect(goalViewerLayoutFrom('list')).toBe('list');
  });
});
