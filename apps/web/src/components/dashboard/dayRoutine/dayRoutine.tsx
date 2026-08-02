import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Routine } from "@beyou/types/routine/routine";
import type { RootState } from "@beyou/state/rootReducer";
import RoutineSection from "./routineSection";
import RoutineCompleteSummary from "./RoutineCompleteSummary";
import EmptyState from "../../EmptyState";

export default function RoutineDay({ routine }: { routine: Routine | null }) {
    const { t } = useTranslation();
    const checked = useSelector((s: RootState) => s.perfil.checkedItemsInScheduledRoutine);
    const total = useSelector((s: RootState) => s.perfil.totalItemsInScheduledRoutine);

    if (routine === null) {
        return (
            <div data-tutorial-id="dashboard-routine-today">
                <EmptyState
                    emoji="🗓️"
                    title={t("No Routines Scheduled for today")}
                    description={t("Create your first routine to see it here")}
                    actionLabel={t("Routines")}
                    actionTo="/routines"
                    testId="no-routine-today"
                />
            </div>
        );
    }

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
                        {t("TodaysRoutine")} · {t("SectionsCount", { count: sections })}
                    </span>
                </div>

                {/* O progresso do dia vive no cabeçalho do cartão: é o número que
                    responde "quanto falta" sem precisar percorrer a lista. */}
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
            </header>

            {routine.routineSections?.map((section, index) => (
                <RoutineSection key={index} section={section} routineId={routine.id!} />
            ))}
            <RoutineCompleteSummary />
        </section>
    );
}
