import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { RootState } from "../../../redux/rootReducer";
import { RoutineSection, check } from "../../../types/routine/routineSection";

export default function RoutineCompleteSummary() {
    const { t } = useTranslation();
    const checked = useSelector((s: RootState) => s.perfil.checkedItemsInScheduledRoutine);
    const total = useSelector((s: RootState) => s.perfil.totalItemsInScheduledRoutine);
    const constance = useSelector((s: RootState) => s.perfil.constance);
    const routine = useSelector((s: RootState) => s.todayRoutine.routine);

    const today = new Date().toJSON().slice(0, 10);
    const xpToday = useMemo(() => {
        if (!routine) return 0;
        return routine.routineSections.reduce((sum: number, section: RoutineSection) => {
            const groups = [...(section.habitGroup ?? []), ...(section.taskGroup ?? [])];
            return sum + groups.reduce((groupSum: number, group: { habitGroupChecks?: check[]; taskGroupChecks?: check[] }) => {
                const checks: check[] = group.habitGroupChecks ?? group.taskGroupChecks ?? [];
                return groupSum + checks
                    .filter((c: check) => c?.checkDate === today && c?.checked)
                    .reduce((checkSum: number, c: check) => checkSum + (c?.xpGenerated ?? 0), 0);
            }, 0);
        }, 0);
    }, [routine, today]);

    if (total === 0 || checked < total) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mt-3 rounded-xl border border-primary/30 bg-primary/10 p-4 text-center"
            data-testid="routine-complete-summary"
        >
            <p className="text-lg font-bold text-primary">{t("RoutineCompleteTitle")}</p>
            <p className="mt-1 text-sm text-secondary">
                {xpToday > 0
                    ? t("RoutineCompleteMessage", { xp: xpToday, days: constance })
                    : t("RoutineCompleteMessageNoXp", { days: constance })}
            </p>
        </motion.div>
    );
}
