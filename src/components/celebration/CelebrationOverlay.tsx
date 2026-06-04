import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { RootState } from "../../redux/rootReducer";
import { celebrationShifted } from "../../redux/celebration/celebrationSlice";

const AUTO_DISMISS_MS = 4000;

export default function CelebrationOverlay() {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const reduceMotion = useReducedMotion();
    const celebration = useSelector((state: RootState) => state.celebration.queue[0] ?? null);

    useEffect(() => {
        if (!celebration) return;
        const timer = setTimeout(() => dispatch(celebrationShifted()), AUTO_DISMISS_MS);
        return () => clearTimeout(timer);
    }, [celebration, dispatch]);

    useEffect(() => {
        if (!celebration) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") dispatch(celebrationShifted());
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [celebration, dispatch]);

    if (!celebration) return null;

    const isLevelUp = celebration.kind === "levelUp";
    const title = isLevelUp ? t("LevelUpTitle") : t("StreakMilestoneTitle", { days: celebration.days });
    const message = isLevelUp
        ? t("LevelUpMessage", { level: celebration.level })
        : t("StreakMilestoneMessage", { days: celebration.days });
    const badge = isLevelUp ? `LV ${celebration.level}` : `${celebration.days}`;
    const badgeCaption = isLevelUp ? "" : t("Days");

    return (
        <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => dispatch(celebrationShifted())}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            data-testid="celebration-overlay"
        >
            <motion.div
                className="flex flex-col items-center rounded-2xl border-2 border-primary bg-background px-10 py-8 text-center shadow-2xl"
                initial={{ scale: reduceMotion ? 1 : 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                onClick={(e) => e.stopPropagation()}
            >
                <motion.div
                    className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-primary text-background"
                    initial={reduceMotion ? {} : { rotate: -12, scale: 0.6 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
                >
                    <span className="text-2xl font-black">{badge}</span>
                    {badgeCaption && <span className="text-xs font-semibold uppercase">{badgeCaption}</span>}
                </motion.div>
                <h1 className="mt-4 text-2xl font-bold text-primary">{title}</h1>
                <p className="mt-2 max-w-xs text-sm text-secondary">{message}</p>
            </motion.div>
        </motion.div>
    );
}
