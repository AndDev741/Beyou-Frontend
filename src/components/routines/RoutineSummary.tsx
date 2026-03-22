import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Routine } from "../../types/routine/routine";
import { RootState } from "../../redux/rootReducer";
import { getRoutineStats } from "./routineMetrics";

type RoutineSummaryProps = {
    routines: Routine[];
    selectedDate: string;
    onDateChange: (value: string) => void;
};

export const RoutineSummary = ({ routines, selectedDate, onDateChange }: RoutineSummaryProps) => {
    const { t } = useTranslation();
    const snapshotState = useSelector((state: RootState) => state.snapshot) || { snapshots: {}, selectedDate: '', loading: false, snapshotDates: [] };
    const snapshots = snapshotState.snapshots || {};
    const snapshotList = Object.values(snapshots);

    const today = new Date().toISOString().split("T")[0];
    const isSnapshotMode = selectedDate < today && snapshotState.selectedDate === selectedDate;

    const selectedWeekday = useMemo(() => {
        const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const parsed = new Date(selectedDate);
        const index = Number.isNaN(parsed.getDay()) ? 0 : parsed.getDay();
        return weekDays[index];
    }, [selectedDate]);

    const allSections = useMemo(
        () => routines.reduce((acc, routine) => acc + (routine.routineSections?.length || 0), 0),
        [routines]
    );

    const allActiveDays = useMemo(() => {
        const daySet = new Set<string>();
        routines.forEach((routine) => {
            routine.schedule?.days?.forEach((day) => daySet.add(day));
        });
        return daySet.size;
    }, [routines]);

    const routinesForDay = useMemo(
        () =>
            routines.filter((routine) =>
                routine.schedule?.days?.some((day) => day.toLowerCase() === selectedWeekday.toLowerCase())
            ),
        [routines, selectedWeekday]
    );

    const scheduleSummary = useMemo(() => {
        if (isSnapshotMode && snapshotList.length > 0) {
            const allChecks = snapshotList.flatMap((s) => s.checks);
            return {
                totalRoutines: snapshotList.length,
                totalSections: snapshotList.reduce((acc, s) => acc + s.structure.sections.length, 0),
                totalItems: allChecks.length,
                completed: allChecks.filter((c) => c.checked).length,
                xp: allChecks.reduce((sum, c) => sum + (c.xpGenerated || 0), 0),
            };
        }

        return routinesForDay.reduce(
            (acc, routine) => {
                acc.totalRoutines += 1;
                acc.totalSections += routine.routineSections?.length || 0;

                const routineStats = getRoutineStats(routine, selectedDate);
                acc.totalItems += routineStats.totalItems;
                acc.completed += routineStats.completedItems;
                acc.xp += routineStats.xpEarned;
                return acc;
            },
            { totalRoutines: 0, totalSections: 0, totalItems: 0, completed: 0, xp: 0 }
        );
    }, [routinesForDay, selectedDate, isSnapshotMode, snapshotList]);

    return (
        <div className={`w-full rounded-xl border bg-background p-4 shadow-sm ${
            isSnapshotMode
                ? "border-description/40"
                : "border-primary/20"
        }`}>
            <div className="flex flex-wrap items-center justify-center md:justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <p className="text-center md:text-left text-lg font-semibold">{t("Routines overview")}</p>
                        {isSnapshotMode && (
                            <span className="inline-flex items-center rounded-full border border-description/30 bg-description/10 px-2.5 py-0.5 text-xs font-semibold text-description">
                                {t("Historical view")}
                            </span>
                        )}
                    </div>
                    <p className="text-center md:text-left text-sm text-description">
                        {isSnapshotMode
                            ? t("Viewing snapshot data for the selected date")
                            : t("Stay on track with your daily sections and checks")
                        }
                    </p>
                </div>
                <label className="flex flex-col md:flex-row items-center gap-2 text-sm font-medium">
                    <span>{t("Selected day")}</span>
                    <input
                        type="date"
                        value={selectedDate}
                        max={today}
                        onChange={(e) => onDateChange(e.target.value)}
                        className={`rounded-md border bg-background px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-1 ${
                            isSnapshotMode
                                ? "border-description/40 focus:border-description focus:ring-description"
                                : "border-primary/30 focus:border-primary focus:ring-primary"
                        }`}
                    />
                </label>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <SummaryCard
                    title={isSnapshotMode ? t("Snapshots") : t("Routines")}
                    value={isSnapshotMode ? snapshotList.length : routines.length}
                />
                <SummaryCard title={t("Sections")} value={isSnapshotMode ? scheduleSummary.totalSections : allSections} />
                <SummaryCard
                    title={t("Schedule items completed")}
                    value={`${scheduleSummary.completed}/${scheduleSummary.totalItems || 0}`}
                    accent="success"
                />
                <SummaryCard
                    title={isSnapshotMode ? t("XP earned") : t("Active days")}
                    value={isSnapshotMode ? `+${scheduleSummary.xp} XP` : allActiveDays}
                />
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
