import category from "../category/categoryType";

export type editGoal = {
  goalId: string;
  title: string;
  description: string;
  iconId: string;
  targetValue: number;
  unit: string;
  currentValue: number;
  complete: boolean;
  categories: category[];
  motivation: string;
  startDate: string;
  endDate: string;
  status: string;
  term: string;
};