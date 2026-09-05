import type { goal } from '@beyou/types/goals/goalType';

/**
 * Nested goals, assembled on the client.
 *
 * The server only sends `parentId` on each goal and enforces the rules that keep the tree
 * honest (same owner, no cycle, MAX_GOAL_DEPTH levels). Everything here is presentation
 * derived from the flat list both apps already hold in the `goals` slice, so web and
 * mobile read the same numbers and neither needs a second request.
 */

/** Mirror of GoalService.MAX_DEPTH. The pickers pre-filter with it; the server decides. */
export const MAX_GOAL_DEPTH = 3;

export type GoalChildrenSummary = {
  /** Direct children. */
  total: number;
  /** Direct children that are complete. */
  completed: number;
  /** Mean of the children's own progress fractions, 0..1. 0 when there are no children. */
  progress: number;
};

const byId = (goals: goal[]): Map<string, goal> => {
  const map = new Map<string, goal>();
  goals.forEach((g) => map.set(g.id, g));
  return map;
};

/** Progress fraction of one goal, clamped to 0..1. A target of 0 never counts as progress. */
export const goalProgress = (g: goal): number => {
  if (!g.targetValue || g.targetValue <= 0) return g.complete ? 1 : 0;
  return Math.min(1, Math.max(0, g.currentValue / g.targetValue));
};

/** Direct children of `parentId`, in the input order. */
export function childrenOf(goals: goal[], parentId: string): goal[] {
  return goals.filter((g) => g.parentId === parentId);
}

/** Goals with no parent, or whose parent is not in the list (an orphaned reference reads as a root). */
export function rootGoals(goals: goal[]): goal[] {
  const ids = byId(goals);
  return goals.filter((g) => !g.parentId || !ids.has(g.parentId));
}

/** `true` when the goal has at least one child in the list. */
export function hasChildren(goals: goal[], goalId: string): boolean {
  return goals.some((g) => g.parentId === goalId);
}

/** The parent chain from the goal's parent up to the root, nearest first. Stops on a broken or looping chain. */
export function ancestorsOf(goals: goal[], goalId: string): goal[] {
  const ids = byId(goals);
  const seen = new Set<string>([goalId]);
  const out: goal[] = [];
  let cursor = ids.get(goalId);
  while (cursor?.parentId) {
    const parent = ids.get(cursor.parentId);
    if (!parent || seen.has(parent.id)) break;
    seen.add(parent.id);
    out.push(parent);
    cursor = parent;
  }
  return out;
}

/** Every goal under `goalId`, depth first, children before their own children. */
export function descendantsOf(goals: goal[], goalId: string): goal[] {
  const out: goal[] = [];
  const seen = new Set<string>([goalId]);
  const walk = (id: string) => {
    childrenOf(goals, id).forEach((child) => {
      if (seen.has(child.id)) return;
      seen.add(child.id);
      out.push(child);
      walk(child.id);
    });
  };
  walk(goalId);
  return out;
}

/** 1 for a root, 2 for its child, 3 for a grandchild. */
export function depthOf(goals: goal[], goalId: string): number {
  return ancestorsOf(goals, goalId).length + 1;
}

/** Longest chain under the goal: 0 for a leaf, 1 with children, 2 with grandchildren. */
export function subtreeHeight(goals: goal[], goalId: string): number {
  const children = childrenOf(goals, goalId);
  if (children.length === 0) return 0;
  return 1 + Math.max(...children.map((c) => subtreeHeight(goals, c.id)));
}

export function childrenSummary(goals: goal[], goalId: string): GoalChildrenSummary {
  const children = childrenOf(goals, goalId);
  if (children.length === 0) return { total: 0, completed: 0, progress: 0 };
  const completed = children.filter((c) => c.complete).length;
  const progress = children.reduce((sum, c) => sum + goalProgress(c), 0) / children.length;
  return { total: children.length, completed, progress };
}

/** All direct children complete, and at least one child. The card's "complete the parent?" nudge. */
export function allChildrenComplete(goals: goal[], goalId: string): boolean {
  const s = childrenSummary(goals, goalId);
  return s.total > 0 && s.completed === s.total;
}

/**
 * Goals the picker may offer as a parent for `goalId` (or for a new goal when undefined).
 *
 * Same list the server would accept: not the goal itself, not one of its descendants, and
 * shallow enough that the goal's own subtree still fits under MAX_GOAL_DEPTH. A mismatch
 * here is only a worse picker; the server refuses whatever slipped through.
 */
export function eligibleParents(goals: goal[], goalId?: string): goal[] {
  const below = goalId ? subtreeHeight(goals, goalId) : 0;
  const excluded = new Set<string>(goalId ? [goalId, ...descendantsOf(goals, goalId).map((d) => d.id)] : []);
  return goals.filter((candidate) => {
    if (excluded.has(candidate.id)) return false;
    // depthOf(candidate) ancestors+self, +1 for the goal, +below for what hangs under it.
    return depthOf(goals, candidate.id) + 1 + below <= MAX_GOAL_DEPTH;
  });
}

export type GoalTreeNode = { goal: goal; children: GoalTreeNode[] };

/**
 * The forest, roots in the given root order and children in `sortChildren` order (input
 * order when omitted). Built once per render from the flat slice.
 */
export function buildGoalTree(
  goals: goal[],
  sortChildren?: (children: goal[]) => goal[],
): GoalTreeNode[] {
  const seen = new Set<string>();
  const node = (g: goal): GoalTreeNode => {
    seen.add(g.id);
    const kids = childrenOf(goals, g.id).filter((c) => !seen.has(c.id));
    const ordered = sortChildren ? sortChildren(kids) : kids;
    return { goal: g, children: ordered.map(node) };
  };
  return rootGoals(goals).map(node);
}

/**
 * Which roots a filtered page should show, given the goals that passed the filter.
 *
 * A root passes on its own merits, or because a descendant did: hiding the parent of a
 * matching sub-goal would leave the match with no place to render. The second set says
 * which of those roots only made it through a descendant, so the UI can dim them.
 */
export function rootsForFilter(
  goals: goal[],
  matching: goal[],
): { roots: goal[]; viaDescendantOnly: Set<string> } {
  const matchIds = new Set(matching.map((g) => g.id));
  const ids = byId(goals);
  const keep = new Set<string>();
  const direct = new Set<string>();
  matching.forEach((g) => {
    let cursor: goal | undefined = g;
    const guard = new Set<string>();
    while (cursor) {
      if (guard.has(cursor.id)) break;
      guard.add(cursor.id);
      if (!cursor.parentId || !ids.has(cursor.parentId)) {
        keep.add(cursor.id);
        if (matchIds.has(cursor.id)) direct.add(cursor.id);
        break;
      }
      cursor = ids.get(cursor.parentId);
    }
  });
  const roots = rootGoals(goals).filter((r) => keep.has(r.id));
  const viaDescendantOnly = new Set(roots.filter((r) => !direct.has(r.id)).map((r) => r.id));
  return { roots, viaDescendantOnly };
}
