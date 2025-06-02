export type RoutineSection = {
    name: string;
    iconId: string;
    startTime: string;
    endTime: string;
    taskGroup?: Array<{
        taskId: string;
        startTime: string;
    }>;
    habitGroup?: Array<{
        habitId: string;
        startTime: string;
    }>;
};