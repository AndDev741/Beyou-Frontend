import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Routine } from "@beyou/types/routine/routine";
import { isListRoutine } from "@beyou/state";
import type { RootState } from "@beyou/state/rootReducer";
import RoutineSection from "./routineSection";
import RoutineCompleteSummary from "./RoutineCompleteSummary";
import EmptyState from "../../EmptyState";
import { CalendarDays, Maximize2 } from "lucide-react";

export default function RoutineDay({ routine }: { routine: Routine | null }) {
    const { t } = useTranslation();
    const checked = useSelector((s: RootState) => s.perfil.checkedItemsInScheduledRoutine);
    const total = useSelector((s: RootState) => s.perfil.totalItemsInScheduledRoutine);
    // The focus screen renders THIS component, so without the guard the way in would be
    // offered from inside the screen it leads to.
    const focusMode = useSelector((s: RootState) => s.focus.mode);

    if (routine === null) {
        return (
            <div data-tutorial-id="dashboard-routine-today">
                <EmptyState
                    icon={<CalendarDays size={20} aria-hidden="true" />}
                    title={t("No Routines Scheduled for today")}
                    description={t("NothingScheduledTodayDescription")}
                    actionLabel={t("ScheduleRoutine")}
                    actionTo="/routines"
                    testId="no-routine-today"
                />
            </div>
        );
    }

    const isList = isListRoutine(routine);
    const sections = routine.routineSections?.length ?? 0;
    const progress = total > 0 ? Math.round((checked / total) * 100) : 0;

    return (
        <section
            className="rounded-card border border-border bg-surface px-3 pb-3 pt-4 lg:px-5 lg:pt-5"
            data-tutorial-id="dashboard-routine-today"
        >
            <header className="flex items-center gap-3 pb-3 lg:gap-4 lg:pb-3.5">
                <div className="min-w-0">
                    <b className="block truncate text-base font-semibold tracking-[-0.01em] text-text">
                        {routine.name}
                    </b>
                    <span className="text-xs text-text-3">
                        {/* A list has no sections to count — the routine IS the list. */}
                        {isList
                            ? `${t("TodaysRoutine")} · ${t("RoutineTypeList")}`
                            : `${t("TodaysRoutine")} · ${t("SectionsCount", { count: sections })}`}
                    </span>
                </div>

                {/* The day's progress lives in the card's header: it is the number
                    that answers "how much is left" without walking the list. */}
                {total > 0 && (
                    <div className="ml-auto shrink-0 text-right">
                        <span className="font-mono text-[12.5px] font-medium text-text-2">
                            {checked} {t("Of")} {total}
                        </span>
                        <div className="mt-1.5 h-1.5 w-[92px] overflow-hidden rounded-full bg-surface-2 lg:w-[148px]">
                            <div
                                className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Only on today's card. The routines page renders history through
                    SnapshotRoutineCard, which deliberately does not get this: focus is about
                    the day in progress, and there is nothing to execute in a past one. */}
                {focusMode === "off" && (
                    <Link
                        to="/focus"
                        aria-label={t("FocusEnter")}
                        title={t("FocusEnter")}
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-text-2 transition-colors hover:bg-surface-2 hover:text-text ${total > 0 ? "ml-3" : "ml-auto"}`}
                        data-testid="focus-enter"
                    >
                        {/* Icon only. The label lives in `aria-label` and `title`, so screen
                            readers and a hover still name it. */}
                        <Maximize2 size={16} aria-hidden="true" />
                    </Link>
                )}
            </header>

            {routine.routineSections?.map((section, index) => (
                <RoutineSection
                    key={index}
                    section={section}
                    routineId={routine.id!}
                    variant={isList ? "list" : "section"}
                    listOrder={isList ? (routine.items ?? []).map((item) => item.id) : undefined}
                />
            ))}
            <RoutineCompleteSummary />
        </section>
    );
}
