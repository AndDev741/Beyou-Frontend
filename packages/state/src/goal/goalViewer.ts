import type { goal } from '@beyou/types/goals/goalType';
import { sortGoals } from '../viewFilters/sortGoals';

/**
 * Ordering for the one-goal-at-a-time screen, shared by web and mobile.
 *
 * `status` walks what is being worked on first, then what has not started, then what is
 * done. `category` groups by the first category's name. Everything else defers to the
 * goals page's `sortGoals`, so the two screens never disagree on what "by deadline" means.
 */
export const GOAL_VIEWER_SORT_KEYS = ['status', 'category', 'end-asc', 'progress-desc', 'name-asc'] as const;
export type GoalViewerSortKey = (typeof GOAL_VIEWER_SORT_KEYS)[number];

export type GoalViewerFilter = {
  sortBy: string;
  /** "all" or a backend status value. */
  status?: string;
  /** "all" or a category id. */
  categoryId?: string;
};

const STATUS_RANK: Record<string, number> = { IN_PROGRESS: 0, NOT_STARTED: 1, COMPLETED: 2 };
const ts = (v?: Date | string | null): number => {
  if (!v) return 0;
  const time = (v instanceof Date ? v : new Date(v)).getTime();
  return Number.isNaN(time) ? 0 : time;
};
const firstCategoryName = (g: goal): string => {
  const first = Object.values(g.categories ?? {})[0];
  return first?.name ?? '';
};

export function isGoalViewerSortKey(value: string): value is GoalViewerSortKey {
  return (GOAL_VIEWER_SORT_KEYS as readonly string[]).includes(value);
}

/** The ordered deck the viewer walks. Never mutates the input. */
export function orderGoalsForViewer(goals: goal[], filter: GoalViewerFilter): goal[] {
  const status = filter.status ?? 'all';
  const categoryId = filter.categoryId ?? 'all';
  const kept = goals.filter((g) => {
    if (status !== 'all' && g.status !== status) return false;
    if (categoryId !== 'all' && !(categoryId in (g.categories ?? {}))) return false;
    return true;
  });
  switch (filter.sortBy) {
    case 'status':
      return [...kept].sort((a, b) => {
        const rank = (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
        return rank !== 0 ? rank : ts(a.endDate) - ts(b.endDate);
      });
    case 'category':
      return [...kept].sort((a, b) => {
        const an = firstCategoryName(a);
        const bn = firstCategoryName(b);
        // Goals without a category go last, alphabetical within a category, then by deadline.
        if (!an && bn) return 1;
        if (an && !bn) return -1;
        const byName = an.localeCompare(bn, undefined, { sensitivity: 'base' });
        return byName !== 0 ? byName : ts(a.endDate) - ts(b.endDate);
      });
    default:
      return sortGoals(kept, filter.sortBy);
  }
}

/** Where the deck opens: the requested goal's slide, or the first one when it is not in the deck. */
export function viewerIndexFor(deck: goal[], goalId?: string | null): number {
  if (!goalId) return 0;
  const index = deck.findIndex((g) => g.id === goalId);
  return index < 0 ? 0 : index;
}
