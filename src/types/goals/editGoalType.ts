import { CategoryMiniDTO } from "../category/CategoryMiniDTO";

export type editGoal = {
  goalId: string;
  title: string;
  description: string;
  iconId: string;
  targetValue: number;
  unit: string;
  currentValue: number;
  complete: boolean;
  categories: Record<string, CategoryMiniDTO>;
  motivation: string;
  startDate: string;
  endDate: string;
  status: string;
  term: string;
};
