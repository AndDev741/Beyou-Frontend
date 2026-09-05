import { CategoryMiniDTO } from "../category/CategoryMiniDTO";

export type goal = {
  id: string;
  name: string;
  iconId: string;
  description?: string;
  targetValue: number;
  unit: string;
  currentValue: number;
  complete: boolean;
  categories: Record<string, CategoryMiniDTO>;
  motivation?: string;
  startDate: Date;
  endDate: Date;
  xpReward: number;
  status: string;
  term: string;
  /** Set when the goal was completed; null or absent while it is open. */
  completeDate?: string | null;
  /**
   * The goal this one sits under, or null for a top-level goal. The server keeps
   * the tree honest (same owner, no cycle, at most three levels); clients only
   * build the tree from this field, see `@beyou/state` goalTree.
   */
  parentId?: string | null;
};