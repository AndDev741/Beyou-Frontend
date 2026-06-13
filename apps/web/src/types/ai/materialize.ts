/** Mirror of the backend MaterializeRoutineResponseDTO. */
export type MaterializeResponse = {
    name: string;
    iconId?: string | null;
    scheduleDays?: string[] | null;
    sections: MaterializeSection[];
    newCategoryIds: string[];
    newHabitIds: string[];
    newTaskIds: string[];
};

export type MaterializeSection = {
    name: string;
    iconId?: string | null;
    startTime: string;
    endTime?: string | null;
    habitGroup: { habitId: string; startTime?: string | null; endTime?: string | null }[];
    taskGroup: { taskId: string; startTime?: string | null; endTime?: string | null }[];
};
