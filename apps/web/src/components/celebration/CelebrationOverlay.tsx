import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Flame } from "lucide-react";
import { RootState } from "@beyou/state/rootReducer";
import { celebrationShifted } from "@beyou/state/celebration/celebrationSlice";
import Ring from "../../ui/Ring";
import Button from "../Button";

const AUTO_DISMISS_MS = 4000;

/**
 * The mockup's celebration: the system ring filled, with the level number in the
 * centre, a title, one line of body and "Continue". It is the same piece as the
 * check-in and the brand — levelling up is the ring closing.
 */
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
    const dismiss = () => dispatch(celebrationShifted());

    return (
        <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-5 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={dismiss}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            data-testid="celebration-overlay"
        >
            <motion.div
                className="w-full max-w-[340px] rounded-card border border-border bg-surface px-7 py-8 text-center shadow-2xl"
                initial={{ scale: reduceMotion ? 1 : 0.9, opacity: 0, y: reduceMotion ? 0 : 8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                onClick={(e) => e.stopPropagation()}
            >
                <motion.div
                    className="relative mx-auto flex h-[104px] w-[104px] items-center justify-center"
                    initial={reduceMotion ? {} : { scale: 0.7 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                >
                    {/* Halo: the filled ring is the message, the glow only backs it. */}
                    <span aria-hidden="true" className="absolute inset-0 rounded-full bg-accent-soft" />
                    {isLevelUp ? (
                        <Ring
                            size={96}
                            state="progress"
                            progress={1}
                            label={String(celebration.level)}
                            className="relative"
                        />
                    ) : (
                        <span className="relative flex h-24 w-24 items-center justify-center">
                            <span className="absolute inset-0">
                                <Ring size={96} state="progress" progress={1} />
                            </span>
                            <span className="relative flex flex-col items-center gap-0.5 text-flame">
                                <Flame size={18} aria-hidden="true" />
                                <span className="font-mono text-[22px] font-semibold leading-none text-text">
                                    {celebration.days}
                                </span>
                            </span>
                        </span>
                    )}
                </motion.div>

                <h1 className="mt-5 text-[19px] font-semibold tracking-[-0.01em] text-text">{title}</h1>
                <p className="mx-auto mt-2 max-w-[15rem] text-[13px] leading-snug text-text-3">{message}</p>

                <Button
                    text={t("Continue")}
                    mode="primary"
                    size="medium"
                    type="button"
                    onClick={dismiss}
                    className="mt-6 w-full"
                    testId="celebration-continue"
                />
            </motion.div>
        </motion.div>
    );
}
