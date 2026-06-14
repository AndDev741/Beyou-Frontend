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
        endTime?: string;
    }>;
    habitGroup?: Array<{
        id?: string,
        habitGroupChecks?: check[],
        habitId: string;
        startTime: string;
        endTime?: string;
    }>;
    order: number;
    favorite?: boolean;
};

export type check = {
    id: string,
    checkDate: string,
    checkTime: string,
    checked: boolean,
    skipped?: boolean,
    xpGenerated: number
}
