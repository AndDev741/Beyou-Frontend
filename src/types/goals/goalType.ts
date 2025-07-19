import category from "../category/categoryType";

export type goal = {
  id: string;
  name: string;
  iconId: string;
  description?: string;
  targetValue: number;
  unit: string;
  currentValue: number;
  complete: boolean;
  categories: category[];
  motivation?: string;
  startDate: Date;
  endDate: Date;
  xpReward: number;
  status: string;
  term: string;
};