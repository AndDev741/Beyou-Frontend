import type { goal } from '@beyou/types/goals/goalType';
import { sortGoals } from '../viewFilters/sortGoals';
import { ancestorsOf } from './goalTree';
import { rootsForFilter } from './goalTree';

/**
 * Ordering for the one-goal-at-a-time screen, shared by web and mobile.
 *
 * `status` walks what is being worked on first, then what has not started, then what is
 * done. `category` groups by the first category's name. Everything else defers to the
 * goals page's `sortGoals`, so the two screens never disagree on what "by deadline" means.
 */
export const GOAL_VIEWER_SORT_KEYS = ['status', 'category', 'end-asc', 'progress-desc', 'name-asc'] as const;
export type GoalViewerSortKey = (typeof GOAL_VIEWER_SORT_KEYS)[number];

/**
 * The deck's shape. `grouped` walks the main goals only and opens a sub-goal from inside its
 * parent (the sub-goal is not a slide of its own); `list` walks every goal as its own slide,
 * the way the viewer worked before the choice existed.
 */
export const GOAL_VIEWER_LAYOUTS = ['grouped', 'list'] as const;
export type GoalViewerLayout = (typeof GOAL_VIEWER_LAYOUTS)[number];
export const DEFAULT_GOAL_VIEWER_LAYOUT: GoalViewerLayout = 'grouped';

export function isGoalViewerLayout(value: unknown): value is GoalViewerLayout {
  return typeof value === 'string' && (GOAL_VIEWER_LAYOUTS as readonly string[]).includes(value);
}

/** The stored preference, or the default when the stored blob predates it or holds junk. */
export function goalViewerLayoutFrom(value: unknown): GoalViewerLayout {
  return isGoalViewerLayout(value) ? value : DEFAULT_GOAL_VIEWER_LAYOUT;
}

export type GoalViewerFilter = {
  sortBy: string;
  /** "all" or a backend status value. */
  status?: string;
  /** "all" or a category id. */
  categoryId?: string;
  /** Defaults to `list`, the historical shape, so callers that never heard of layouts keep theirs. */
  layout?: GoalViewerLayout;
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
  const matching = goals.filter((g) => {
    if (status !== 'all' && g.status !== status) return false;
    if (categoryId !== 'all' && !(categoryId in (g.categories ?? {}))) return false;
    return true;
  });
  // Grouped: a slide per root. A root stays when it matches or when one of its sub-goals
  // does, for the same reason the goals page keeps it: the match needs a parent to open from.
  const kept = (filter.layout ?? 'list') === 'grouped' ? rootsForFilter(goals, matching).roots : matching;
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

export type GoalViewerSlide = {
  /** Which deck slide is under the person. */
  index: number;
  /**
   * A goal shown INSTEAD of the slide's own: a sub-goal opened from inside its parent in the
   * grouped layout. `null` means the slide shows its own goal. Never set for a goal that is a
   * slide itself, so the list layout always resolves to `null`.
   */
  openId: string | null;
};

/**
 * Where a requested goal lives in the deck. Its own slide when it has one; otherwise the slide
 * of its nearest ancestor that does, with the goal itself opened on top (the grouped layout's
 * drill-in). A goal with no slide and no ancestor in the deck lands on the first slide.
 */
export function viewerSlideFor(deck: goal[], goals: goal[], goalId?: string | null): GoalViewerSlide {
  if (!goalId) return { index: 0, openId: null };
  const own = deck.findIndex((g) => g.id === goalId);
  if (own >= 0) return { index: own, openId: null };
  for (const ancestor of ancestorsOf(goals, goalId)) {
    const at = deck.findIndex((g) => g.id === ancestor.id);
    if (at >= 0) return { index: at, openId: goalId };
  }
  return { index: 0, openId: null };
}
