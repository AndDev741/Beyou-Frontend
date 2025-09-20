export type RoutineSection = {
    id: string,
    name: string;
    iconId: string;
    startTime: string;
    endTime: string;
    taskGroup?: Array<{
        id?: string,
        taskGroupChecks?: any[],
        taskId: string;
        startTime: string;
    }>;
    habitGroup?: Array<{
        id?: string,
        habitGroupChecks?: any[],
        habitId: string;
        startTime: string;
    }>;
    order: number
};