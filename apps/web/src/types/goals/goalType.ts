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
};