import { Routine } from "../../types/routine/routine";
import { RoutineSection } from "../../types/routine/routineSection";

export type SectionStats = {
    totalItems: number;
    completedItems: number;
    xpEarned: number;
};

export const formatTime = (time?: string): string => {
    if (!time) return "--:--";
    const parts = time.split(":");
    if (parts.length >= 2) {
        return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
    }
    return time;
};

export const formatTimeRange = (start?: string, end?: string): string => {
    if (!start && !end) return "";
    if (start && end) return `${formatTime(start)} - ${formatTime(end)}`;
    return start ? formatTime(start) : formatTime(end);
};

export const getTimeOfDay = (startTime?: string): "morning" | "afternoon" | "evening" | "night" => {
    const hour = startTime ? Number(startTime.split(":")[0]) : 0;
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 21) return "evening";
    return "night";
};

const collectChecks = (checks: any[] | undefined, date: string) => {
    const safeChecks = checks || [];
    return safeChecks.filter((check) => {
        if (!date) return Boolean(check?.checked);
        return check?.checkDate === date && Boolean(check?.checked);
    });
};

export const getSectionStats = (section: RoutineSection, date: string): SectionStats => {
    let totalItems = 0;
    let completedItems = 0;
    let xpEarned = 0;

    section.taskGroup?.forEach((task) => {
        totalItems += 1;
        const relevantChecks = collectChecks(task.taskGroupChecks, date);
        if (relevantChecks.length > 0) completedItems += 1;
        relevantChecks.forEach((check) => {
            if (typeof check?.xpGenerated === "number") {
                xpEarned += check.xpGenerated;
            }
        });
    });

    section.habitGroup?.forEach((habit) => {
        totalItems += 1;
        const relevantChecks = collectChecks(habit.habitGroupChecks, date);
        if (relevantChecks.length > 0) completedItems += 1;
        relevantChecks.forEach((check) => {
            if (typeof check?.xpGenerated === "number") {
                xpEarned += check.xpGenerated;
            }
        });
    });

    return { totalItems, completedItems, xpEarned };
};

export const getRoutineStats = (routine: Routine, date: string): SectionStats => {
    return routine.routineSections?.reduce<SectionStats>(
        (acc, section) => {
            const stats = getSectionStats(section, date);
            return {
                totalItems: acc.totalItems + stats.totalItems,
                completedItems: acc.completedItems + stats.completedItems,
                xpEarned: acc.xpEarned + stats.xpEarned,
            };
        },
        { totalItems: 0, completedItems: 0, xpEarned: 0 }
    ) || { totalItems: 0, completedItems: 0, xpEarned: 0 };
};

export const countItemsInRoutine = (routine: Routine): number => {
    return routine.routineSections?.reduce((total, section) => {
        const tasks = section.taskGroup?.length || 0;
        const habits = section.habitGroup?.length || 0;
        return total + tasks + habits;
    }, 0) || 0;
};
