import type { goal } from '@beyou/types/goals/goalType';

/**
 * Archived goals are put away, not gone: the server still returns them in the one goals list,
 * and each screen decides where they show. That keeps a single cached list and a single query,
 * and it means restoring needs no second fetch.
 *
 * Every place that shows goals as things to work on (the goals page by default, the viewer,
 * the dashboard, the parent pickers) goes through `activeGoals`. The goals page's "Archived"
 * filter is the one place that asks for `archivedGoals`.
 */
export const isGoalArchived = (g: Pick<goal, 'archivedAt'>): boolean => Boolean(g.archivedAt);

export const activeGoals = (goals: goal[]): goal[] => goals.filter((g) => !isGoalArchived(g));

export const archivedGoals = (goals: goal[]): goal[] => goals.filter(isGoalArchived);

/**
 * The list after an archive or restore, patched with what the server said changed. The answer
 * carries every goal it touched (the sub-goals archived along with it too), so this is the
 * whole update and no refetch is needed for the page to be right.
 */
export function applyArchiveResult(goals: goal[], changed: goal[]): goal[] {
  const byId = new Map(changed.map((g) => [g.id, g]));
  return goals.map((g) => byId.get(g.id) ?? g);
}
