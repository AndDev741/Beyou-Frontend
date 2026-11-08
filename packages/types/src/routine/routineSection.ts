import type { WeekDay } from "../schedule/weekDay";

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
        /** See `days` on habitGroup. */
        days?: WeekDay[];
    }>;
    habitGroup?: Array<{
        id?: string,
        habitGroupChecks?: check[],
        habitId: string;
        startTime: string;
        endTime?: string;
        /**
         * The weekdays this item runs on, inside the days the routine itself runs.
         * Empty, or absent on anything stored before the field existed, means "every day the
         * routine runs". Read it through `isItemActiveOn` from @beyou/state.
         */
        days?: WeekDay[];
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
