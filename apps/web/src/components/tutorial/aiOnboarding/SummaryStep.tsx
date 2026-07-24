import { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
    ArrowRight,
    CalendarClock,
    Compass,
    FolderOpen,
    ListChecks,
    PartyPopper,
    Repeat,
    Sparkles,
    Star,
    Target
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { WizardData } from "./AiOnboardingWizard";
import { CreatedRef } from "@beyou/state/onboarding/createFromSuggestions";

interface SummaryStepProps {
    data: WizardData;
    onStart: () => void;
    onTour: () => void;
}

/** Deterministic sparkle placements around the celebration badge. */
const SPARKLES = [
    { top: "-18%", left: "8%", size: 16, delay: 0 },
    { top: "-6%", left: "88%", size: 20, delay: 0.25 },
    { top: "55%", left: "-4%", size: 14, delay: 0.5 },
    { top: "70%", left: "96%", size: 16, delay: 0.75 }
];

/** Final wizard screen: celebrates everything the AI setup created and hands off
 *  to the dashboard (onStart) or the hands-on spotlight tour (onTour). */
export default function SummaryStep({ data, onStart, onTour }: SummaryStepProps) {
    const { t } = useTranslation();
    const prefersReducedMotion = useReducedMotion();

    const groups: Array<{ labelKey: string; icon: ReactNode; items: CreatedRef[] }> = [
        {
            labelKey: "AiOnboardingSummaryCategories",
            icon: <FolderOpen className="w-4 h-4 text-primary" />,
            items: data.categories
        },
        {
            labelKey: "AiOnboardingSummaryHabits",
            icon: <Repeat className="w-4 h-4 text-primary" />,
            items: data.habits
        },
        {
            labelKey: "AiOnboardingSummaryTasks",
            icon: <ListChecks className="w-4 h-4 text-primary" />,
            items: data.tasks
        },
        {
            labelKey: "AiOnboardingSummaryRoutine",
            icon: <CalendarClock className="w-4 h-4 text-primary" />,
            items: data.routineName ? [{ id: "routine", name: data.routineName }] : []
        },
        {
            labelKey: "AiOnboardingSummaryGoals",
            icon: <Target className="w-4 h-4 text-primary" />,
            items: data.goals
        }
    ].filter((group) => group.items.length > 0);

    return (
        <div className="flex flex-col items-center gap-8 w-full max-w-2xl mx-auto text-center">
            {/* Celebration badge with orbiting sparkles */}
            <div className="relative">
                <motion.div
                    initial={prefersReducedMotion ? false : { scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                    className="flex w-20 h-20 items-center justify-center rounded-3xl shadow-lg"
                    style={{
                        backgroundColor: "color-mix(in srgb, var(--primary) 14%, var(--background))",
                        border: "1px solid color-mix(in srgb, var(--primary) 30%, var(--background))"
                    }}
                >
                    <PartyPopper className="w-10 h-10 text-primary" />
                </motion.div>
                {!prefersReducedMotion &&
                    SPARKLES.map((s, index) => (
                        <motion.span
                            key={index}
                            aria-hidden="true"
                            className="absolute text-primary"
                            style={{ top: s.top, left: s.left }}
                            initial={{ opacity: 0, scale: 0, rotate: -30 }}
                            animate={{
                                opacity: [0, 1, 0],
                                scale: [0.4, 1, 0.4],
                                rotate: [0, 20, 0],
                                y: [0, -8, 0]
                            }}
                            transition={{
                                duration: 2.4,
                                delay: s.delay,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            {index % 2 === 0 ? (
                                <Sparkles style={{ width: s.size, height: s.size }} />
                            ) : (
                                <Star style={{ width: s.size, height: s.size }} />
                            )}
                        </motion.span>
                    ))}
            </div>

            {/* Celebratory header */}
            <div className="space-y-3 px-2">
                <h2
                    className="text-3xl md:text-5xl font-bold leading-tight bg-clip-text text-transparent"
                    style={{
                        backgroundImage:
                            "linear-gradient(100deg, var(--primary), color-mix(in srgb, var(--primary) 45%, var(--secondary)))",
                        WebkitBackgroundClip: "text"
                    }}
                >
                    {t("AiOnboardingSummaryTitle")}
                </h2>
                <p className="text-description max-w-md mx-auto md:text-lg">
                    {t("AiOnboardingSummaryDescription")}
                </p>
            </div>

            {/* Everything created, grouped */}
            <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: prefersReducedMotion ? 0 : 0.15 }}
                className="w-full rounded-3xl border p-5 md:p-6 text-left shadow-lg space-y-5"
                style={{
                    backgroundColor: "color-mix(in srgb, var(--secondary) 5%, var(--background))",
                    borderColor: "color-mix(in srgb, var(--primary) 18%, var(--background))"
                }}
            >
                {groups.map((group) => (
                    <section key={group.labelKey} className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span
                                className="flex w-7 h-7 items-center justify-center rounded-lg"
                                style={{
                                    backgroundColor:
                                        "color-mix(in srgb, var(--primary) 12%, var(--background))"
                                }}
                            >
                                {group.icon}
                            </span>
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-description">
                                {t(group.labelKey)}
                            </h3>
                            <span className="text-xs font-medium text-description tabular-nums">
                                {group.items.length}
                            </span>
                        </div>
                        <ul className="flex flex-wrap gap-2 pl-9">
                            {group.items.map((item) => (
                                <li
                                    key={item.id}
                                    className="rounded-full px-3 py-1 text-sm font-medium text-secondary"
                                    style={{
                                        backgroundColor:
                                            "color-mix(in srgb, var(--primary) 8%, var(--background))",
                                        border: "1px solid color-mix(in srgb, var(--primary) 16%, var(--background))"
                                    }}
                                >
                                    {item.name}
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </motion.div>

            {/* CTAs */}
            <div className="flex w-full max-w-md flex-col gap-3">
                <button
                    type="button"
                    onClick={onStart}
                    className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-white shadow-lg hover:opacity-90 hover:-translate-y-0.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                    <Sparkles className="w-4 h-4" />
                    {t("AiOnboardingStart")}
                    <ArrowRight className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={onTour}
                    style={{ backgroundColor: "color-mix(in srgb, var(--secondary) 12%, var(--background))" }}
                    className="flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-secondary hover:brightness-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                >
                    <Compass className="w-4 h-4" />
                    {t("AiOnboardingTour")}
                </button>
            </div>
        </div>
    );
}
