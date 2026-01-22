export type RoutineSection = {
    id: string,
    name: string;
    iconId: string;
    startTime: string;
    endTime: string;
    taskGroup?: Array<{
        id?: string,
        taskGroupChecks?: check[],
        taskId: string;
        startTime: string;
    }>;
    habitGroup?: Array<{
        id?: string,
        habitGroupChecks?: check[],
        habitId: string;
        startTime: string;
    }>;
    order: number;
    favorite?: boolean;
};

export type check = {
    id: string,
    checkDate: string,
    checkTime: string,
    checked: boolean,
    xpGenerated: number
}