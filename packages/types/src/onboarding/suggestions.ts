export type OnboardingStep = "CATEGORIES" | "HABITS_TASKS" | "ROUTINE" | "GOALS";

export type ItemRef = { name: string; categoryName?: string };

export type OnboardingContext = {
  categories?: string[];
  habits?: ItemRef[];
  tasks?: ItemRef[];
  freeTexts?: string[];
  feedback?: string;
};

export type OnboardingSuggestionRequest = {
  step: OnboardingStep;
  categoryNames?: string[];
  context?: OnboardingContext;
  newRequest?: string;
};

export type CategorySuggestion = { name: string; description: string; iconId: string };

export type HabitSuggestion = {
  name: string; description: string; motivationalPhrase?: string | null;
  iconId: string; categoryName: string; importance: number; difficulty: number;
};

export type TaskSuggestion = {
  name: string; description: string; iconId: string;
  categoryName: string; importance: number; difficulty: number;
};

export type ItemPlacement = { name: string; startTime: string; endTime: string };

export type SectionSuggestion = {
  name: string; iconId: string; startTime: string; endTime: string;
  habits: ItemPlacement[]; tasks: ItemPlacement[];
};

export type RoutineSuggestion = {
  name: string; iconId: string; scheduleDays: string[]; sections: SectionSuggestion[];
};

export type GoalSuggestion = {
  name: string; description: string; iconId: string; categoryName: string;
  targetValue: number; unit: string; motivation?: string | null;
  term: "SHORT_TERM" | "MEDIUM_TERM" | "LONG_TERM"; durationDays: number;
};

export type OnboardingSuggestions = {
  categories?: CategorySuggestion[] | null;
  habits?: HabitSuggestion[] | null;
  tasks?: TaskSuggestion[] | null;
  routine?: RoutineSuggestion | null;
  goals?: GoalSuggestion[] | null;
};
