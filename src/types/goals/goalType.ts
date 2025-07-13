import category from "../category/categoryType";

export type goal = {
  id: string;
  title: string;
  description?: string;
  targetValue: number;
  unit: string;
  currentValue: number;
  complete: boolean;
  category: category;
  motivation?: string;
  startDate: Date;
  endDate: Date;
  xpReward: number;
  status: string;
  term: string;
};