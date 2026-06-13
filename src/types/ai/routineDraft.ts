export type DraftNewCategory = {
    tempKey: string;
    name: string;
    icon?: string;
    description?: string;
};

export type DraftNewHabit = {
    name: string;
    description?: string;
    motivationalPhrase?: string;
    iconId?: string;
    importance: number;
    dificulty: number; // habit wire-format typo — matches CreateHabitDTO
    categoryRefs: string[];
};

export type DraftNewTask = {
    name: string;
    description?: string;
    iconId?: string;
    importance: number;
    difficulty: number; // tasks spell it correctly — matches CreateTaskRequestDTO
    categoryRefs: string[];
    oneTimeTask: boolean;
};

export type DraftHabitItem = {
    existingHabitId?: string | null;
    newHabit?: DraftNewHabit | null;
    startTime?: string | null;
    endTime?: string | null;
};

export type DraftTaskItem = {
    existingTaskId?: string | null;
    newTask?: DraftNewTask | null;
    startTime?: string | null;
    endTime?: string | null;
};

export type DraftSection = {
    name: string;
    iconId?: string | null;
    startTime: string;
    endTime?: string | null;
    habits: DraftHabitItem[];
    tasks: DraftTaskItem[];
};

export type RoutineDraft = {
    name: string;
    iconId?: string | null;
    newCategories: DraftNewCategory[];
    sections: DraftSection[];
    scheduleDays?: string[] | null;
};

export type GenerateRoutinePayload = {
    description: string;
    previousDraft?: RoutineDraft;
    feedback?: string;
    language: string;
};
