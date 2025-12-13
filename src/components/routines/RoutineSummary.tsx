import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Routine } from "../../types/routine/routine";
import { getRoutineStats } from "./routineMetrics";

type RoutineSummaryProps = {
    routines: Routine[];
    selectedDate: string;
    onDateChange: (value: string) => void;
};

export const RoutineSummary = ({ routines, selectedDate, onDateChange }: RoutineSummaryProps) => {
    const { t } = useTranslation();

    const selectedWeekday = useMemo(() => {
        const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const parsed = new Date(selectedDate);
        const index = Number.isNaN(parsed.getDay()) ? 0 : parsed.getDay();
        return weekDays[index];
    }, [selectedDate]);

    const routinesForDay = useMemo(
        () =>
            routines.filter((routine) =>
                routine.schedule?.days?.some((day) => day.toLowerCase() === selectedWeekday.toLowerCase())
            ),
        [routines, selectedWeekday]
    );

    const summary = useMemo(() => {
        const daySet = new Set<string>();
        const scopedRoutines = routinesForDay.length > 0 ? routinesForDay : [];
        return scopedRoutines.reduce(
            (acc, routine) => {
                acc.totalRoutines += 1;
                acc.totalSections += routine.routineSections?.length || 0;

                const routineStats = getRoutineStats(routine, selectedDate);
                acc.totalItems += routineStats.totalItems;
                acc.completed += routineStats.completedItems;
                acc.xp += routineStats.xpEarned;

                routine.schedule?.days?.forEach((day) => daySet.add(day));
                acc.activeDays = daySet.size;
                return acc;
            },
            { totalRoutines: 0, totalSections: 0, totalItems: 0, completed: 0, xp: 0, activeDays: 0 }
        );
    }, [routinesForDay, selectedDate]);

    return (
        <div className="w-full rounded-xl border border-primary/20 bg-background p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-center md:justify-between gap-3">
                <div>
                    <p className="text-center md:text-left text-lg font-semibold">{t("Routines overview")}</p>
                    <p className="text-center md:text-left text-sm text-description">{t("Stay on track with your daily sections and checks")}</p>
                </div>
                <label className="flex flex-col md:flex-row items-center gap-2 text-sm font-medium">
                    <span>{t("Selected day")}</span>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="rounded-md border border-primary/30 bg-background px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                </label>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <SummaryCard title={t("Routines")} value={summary.totalRoutines} />
                <SummaryCard title={t("Sections")} value={summary.totalSections} />
                <SummaryCard
                    title={t("Items completed")}
                    value={`${summary.completed}/${summary.totalItems || 0}`}
                    accent="success"
                />
                <SummaryCard title={t("Active days")} value={summary.activeDays} />
            </div>
        </div>
    );
};

type SummaryCardProps = {
    title: string;
    value: string | number;
    accent?: "primary" | "success";
};

const SummaryCard = ({ title, value, accent = "primary" }: SummaryCardProps) => {
    const accentClass = accent === "success" ? "text-success" : "text-primary";
    return (
        <div className="rounded-lg border border-primary/15 bg-background p-3 shadow-sm">
            <p className="text-sm text-description">{title}</p>
            <p className={`text-xl font-semibold ${accentClass}`}>{value}</p>
        </div>
    );
};
