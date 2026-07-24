import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles, AlertTriangle, RotateCcw, Compass } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useDispatch } from "react-redux";
import clsx, { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import fetchOnboardingSuggestions from "@beyou/api/onboarding/fetchOnboardingSuggestions";
import {
    GoalSuggestion,
    HabitSuggestion,
    RoutineSuggestion,
    TaskSuggestion
} from "@beyou/types/onboarding/suggestions";
import {
    clearWizardProgress,
    loadWizardProgress,
    saveWizardProgress
} from "./aiOnboardingStorage";
import CategoriesStep from "./CategoriesStep";
import HabitsTasksStep, { HabitsTasksSelection } from "./HabitsTasksStep";
import RoutineStep from "./RoutineStep";
import GoalsStep from "./GoalsStep";
import SummaryStep from "./SummaryStep";
import {
    createCategoriesFromSuggestions,
    createGoalsFromSuggestions,
    createHabitsFromSuggestions,
    createRoutineFromSuggestion,
    createTasksFromSuggestions,
    CreatedRef
} from "@beyou/state/onboarding/createFromSuggestions";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export type { CreatedRef };

export type WizardData = {
    categories: CreatedRef[];
    habits: CreatedRef[];
    tasks: CreatedRef[];
    routineName?: string;
    goals: CreatedRef[];
    freeTexts: string[];
};

type WizardStep = "categories" | "habitsTasks" | "routine" | "goals" | "summary";

const STEP_ORDER: WizardStep[] = ["categories", "habitsTasks", "routine", "goals", "summary"];

const STEP_LABEL_KEYS: Record<WizardStep, string> = {
    categories: "AiOnboardingStepCategories",
    habitsTasks: "AiOnboardingStepHabitsTasks",
    routine: "AiOnboardingStepRoutine",
    goals: "AiOnboardingStepGoals",
    summary: "AiOnboardingStepSummary"
};

interface AiOnboardingWizardProps {
    onFinish: () => Promise<void> | void;
    onTakeTour: () => void;
    onFallbackToManual: () => void;
}

export default function AiOnboardingWizard({
    onFinish,
    onTakeTour,
    onFallbackToManual
}: AiOnboardingWizardProps) {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const prefersReducedMotion = useReducedMotion();

    // Resume where a reload interrupted: entities from finished steps already
    // exist, so restarting at "categories" would duplicate them.
    const [stored] = useState(loadWizardProgress);
    const [step, setStep] = useState<WizardStep>(stored?.step ?? "categories");
    const [data, setData] = useState<WizardData>(
        stored?.data ?? {
            categories: [],
            habits: [],
            tasks: [],
            goals: [],
            freeTexts: []
        }
    );
    const [busy, setBusy] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suggestedHabitsTasks, setSuggestedHabitsTasks] = useState<{
        habits: HabitSuggestion[];
        tasks: TaskSuggestion[];
    } | null>(null);
    const [suggestedRoutine, setSuggestedRoutine] = useState<RoutineSuggestion | null>(null);
    const [suggestedGoals, setSuggestedGoals] = useState<GoalSuggestion[] | null>(null);

    // Holds the last failed async action so the error banner's Retry can re-run it.
    const retryRef = useRef<(() => Promise<void>) | null>(null);
    // Guards the habitsTasks initial fetch so it only fires once per wizard run.
    const habitsTasksRequested = useRef(false);
    // Same one-shot guard for the routine draft fetch.
    const routineRequested = useRef(false);
    // Same one-shot guard for the goals suggestions fetch.
    const goalsRequested = useRef(false);

    // `overlay: false` = in-step action (e.g. routine regenerate): the step stays
    // visible and shows its own busy indicator; the full-screen tips overlay is
    // reserved for between-step transitions.
    const runGuarded = async (
        action: () => Promise<void>,
        { overlay = true }: { overlay?: boolean } = {}
    ) => {
        retryRef.current = action;
        setBusy(true);
        setShowOverlay(overlay);
        setError(null);
        try {
            await action();
        } catch {
            setError("ai");
        } finally {
            setBusy(false);
        }
    };

    const handleCategoriesContinue = (names: string[]) => {
        void runGuarded(async () => {
            const res = await fetchOnboardingSuggestions(
                { step: "CATEGORIES", categoryNames: names },
                t
            );
            if (res.error || !res.success) {
                throw new Error("suggestions failed");
            }
            const refs = await createCategoriesFromSuggestions(
                res.success.categories ?? [],
                t,
                dispatch
            );
            setData((prev) => ({ ...prev, categories: refs }));
            setStep("habitsTasks");
        });
    };

    const habitsTasksContext = () => ({
        categories: data.categories.map((c) => c.name)
    });

    const fetchHabitsTasksSuggestions = async () => {
        const res = await fetchOnboardingSuggestions(
            { step: "HABITS_TASKS", context: habitsTasksContext() },
            t
        );
        if (res.error || !res.success) {
            throw new Error("suggestions failed");
        }
        setSuggestedHabitsTasks({
            habits: res.success.habits ?? [],
            tasks: res.success.tasks ?? []
        });
    };

    useEffect(() => {
        if (step !== "habitsTasks" || habitsTasksRequested.current) return;
        habitsTasksRequested.current = true;
        void runGuarded(fetchHabitsTasksSuggestions);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    const handleFetchMoreHabitsTasks = async (newRequest: string) => {
        const res = await fetchOnboardingSuggestions(
            { step: "HABITS_TASKS", context: habitsTasksContext(), newRequest },
            t
        );
        if (res.error || !res.success) {
            // Route the failure through the shared error banner; Retry re-fetches
            // fresh suggestions since the step's local state unmounts with it.
            retryRef.current = fetchHabitsTasksSuggestions;
            setError("ai");
            throw new Error("suggestions failed");
        }
        return {
            habits: res.success.habits ?? [],
            tasks: res.success.tasks ?? []
        };
    };

    const handleHabitsTasksContinue = (sel: HabitsTasksSelection) => {
        void runGuarded(async () => {
            const habitRefs = await createHabitsFromSuggestions(
                sel.habits,
                data.categories,
                t,
                dispatch
            );
            const taskRefs = await createTasksFromSuggestions(
                sel.tasks,
                data.categories,
                t,
                dispatch
            );
            setData((prev) => ({
                ...prev,
                habits: habitRefs,
                tasks: taskRefs,
                freeTexts: [...prev.freeTexts, ...sel.freeTexts]
            }));
            setStep("routine");
        });
    };

    const routineContext = (feedback?: string) => ({
        categories: data.categories.map((c) => c.name),
        habits: data.habits.map((h) => ({ name: h.name })),
        tasks: data.tasks.map((task) => ({ name: task.name })),
        freeTexts: data.freeTexts,
        ...(feedback ? { feedback } : {})
    });

    const fetchRoutineSuggestion = (feedback?: string) => async () => {
        const res = await fetchOnboardingSuggestions(
            { step: "ROUTINE", context: routineContext(feedback) },
            t
        );
        if (res.error || !res.success?.routine) {
            throw new Error("suggestions failed");
        }
        setSuggestedRoutine(res.success.routine);
    };

    useEffect(() => {
        if (step !== "routine" || routineRequested.current) return;
        routineRequested.current = true;
        void runGuarded(fetchRoutineSuggestion());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    const handleRoutineRegenerate = (feedback: string) => {
        void runGuarded(fetchRoutineSuggestion(feedback || undefined), { overlay: false });
    };

    const handleRoutineAccept = (edited: RoutineSuggestion, days: string[]) => {
        void runGuarded(async () => {
            const { name } = await createRoutineFromSuggestion(
                { ...edited, scheduleDays: days },
                data.habits,
                data.tasks,
                t,
                dispatch
            );
            setData((prev) => ({ ...prev, routineName: name }));
            setStep("goals");
        });
    };

    const goalsContext = () => ({
        categories: data.categories.map((c) => c.name),
        habits: data.habits.map((h) => ({ name: h.name })),
        tasks: data.tasks.map((task) => ({ name: task.name })),
        freeTexts: data.freeTexts
    });

    const fetchGoalsSuggestions = async () => {
        const res = await fetchOnboardingSuggestions(
            { step: "GOALS", context: goalsContext() },
            t
        );
        if (res.error || !res.success) {
            throw new Error("suggestions failed");
        }
        setSuggestedGoals(res.success.goals ?? []);
    };

    useEffect(() => {
        if (step !== "goals" || goalsRequested.current) return;
        goalsRequested.current = true;
        void runGuarded(fetchGoalsSuggestions);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    const handleFetchMoreGoals = async (newRequest: string) => {
        const res = await fetchOnboardingSuggestions(
            { step: "GOALS", context: goalsContext(), newRequest },
            t
        );
        if (res.error || !res.success) {
            // Route the failure through the shared error banner; Retry re-fetches
            // fresh suggestions since the step's local state unmounts with it.
            retryRef.current = fetchGoalsSuggestions;
            setError("ai");
            throw new Error("suggestions failed");
        }
        return res.success.goals ?? [];
    };

    const handleGoalsContinue = (selected: GoalSuggestion[]) => {
        void runGuarded(async () => {
            const refs = await createGoalsFromSuggestions(selected, data.categories, t, dispatch);
            setData((prev) => ({ ...prev, goals: refs }));
            setStep("summary");
        });
    };

    // Persist tutorial completion; the wizard unmounts when the phase leaves "ai-onboarding".
    const handleStart = () => {
        void runGuarded(async () => {
            await onFinish();
            clearWizardProgress();
        });
    };

    // Any exit toward the manual tour abandons the AI flow — a later re-entry
    // (tutorial reset in Settings) should start fresh, not resume.
    const exitToTour = () => {
        clearWizardProgress();
        onTakeTour();
    };

    const exitToFallback = () => {
        clearWizardProgress();
        onFallbackToManual();
    };

    const handleRetry = () => {
        if (retryRef.current) void runGuarded(retryRef.current);
    };

    // Persist progress so a refresh resumes this step with the created refs.
    useEffect(() => {
        saveWizardProgress({ step, data });
    }, [step, data]);

    // Lock the page behind the overlay: without this the dashboard keeps its
    // own scrollbars visible next to the wizard. Both elements are locked —
    // body-only relies on overflow propagation to the viewport, which breaks
    // the moment anything sets overflow on <html>, and the dashboard keeps
    // re-rendering (and growing) behind us as the wizard creates entities.
    useEffect(() => {
        const previousBody = document.body.style.overflow;
        const previousHtml = document.documentElement.style.overflow;
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousBody;
            document.documentElement.style.overflow = previousHtml;
        };
    }, []);

    const currentIndex = STEP_ORDER.indexOf(step);

    return (
        // overflow-hidden: the decorative glows extend past the viewport corners and
        // would otherwise force page scrollbars; the step body scrolls on its own.
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--background)] overflow-hidden">
            {/* Ambient glow */}
            <div className="pointer-events-none absolute -z-10 -top-24 -left-24 w-72 h-72 bg-primary opacity-[0.15] rounded-full blur-3xl" />
            <div className="pointer-events-none absolute -z-10 -bottom-24 -right-24 w-72 h-72 bg-primary opacity-[0.1] rounded-full blur-3xl" />

            {/* Header: step dots + escape hatch */}
            <header className="flex items-center justify-between gap-4 px-4 md:px-8 pt-5 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary text-white shadow-md">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="hidden sm:flex items-center gap-2" aria-hidden="true">
                        {STEP_ORDER.map((s, index) => (
                            <div
                                key={s}
                                className={cn(
                                    "h-1.5 rounded-full transition-all duration-300",
                                    index === currentIndex
                                        ? "w-8 bg-primary"
                                        : index < currentIndex
                                          ? "w-4 bg-primary opacity-50"
                                          : "w-4 bg-description opacity-30"
                                )}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-description">
                        {t(STEP_LABEL_KEYS[step])}
                    </span>
                    <button
                        type="button"
                        onClick={exitToTour}
                        aria-label={t("AiOnboardingTakeTour")}
                        title={t("AiOnboardingTakeTour")}
                        className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-secondary hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg px-2 py-1"
                    >
                        <Compass className="w-5 h-5 md:w-4 md:h-4" />
                        {/* Icon-only below md (712px): the label wraps badly next to the step name on phones */}
                        <span className="hidden md:inline whitespace-nowrap">{t("AiOnboardingTakeTour")}</span>
                    </button>
                </div>
            </header>

            {/* Step body — the ONLY scroll container: vertical when a step outgrows
                the viewport (mobile), never horizontal. The inner wrapper keeps short
                steps vertically centered without clipping tall ones (min-h-full trick:
                items-center directly on a scroll container cuts off the top). */}
            <main className="relative flex-1 overflow-y-auto overflow-x-hidden">
                <div className="min-h-full flex items-center justify-center px-4 md:px-8 py-6">
                {error ? (
                    <ErrorBanner
                        onRetry={handleRetry}
                        onTakeTour={exitToFallback}
                        t={t}
                    />
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -16 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="w-full flex justify-center"
                        >
                            {step === "categories" && (
                                <CategoriesStep
                                    onContinue={handleCategoriesContinue}
                                    loading={busy}
                                />
                            )}
                            {step === "habitsTasks" && suggestedHabitsTasks && (
                                <HabitsTasksStep
                                    categories={data.categories}
                                    initial={suggestedHabitsTasks}
                                    loading={busy}
                                    fetchMore={handleFetchMoreHabitsTasks}
                                    onContinue={handleHabitsTasksContinue}
                                />
                            )}
                            {step === "routine" && suggestedRoutine && (
                                <RoutineStep
                                    suggestion={suggestedRoutine}
                                    loading={busy}
                                    onRegenerate={handleRoutineRegenerate}
                                    onAccept={handleRoutineAccept}
                                />
                            )}
                            {step === "goals" && suggestedGoals && (
                                <GoalsStep
                                    categories={data.categories}
                                    initial={suggestedGoals}
                                    loading={busy}
                                    fetchMore={handleFetchMoreGoals}
                                    onContinue={handleGoalsContinue}
                                />
                            )}
                            {step === "summary" && (
                                <SummaryStep
                                    data={data}
                                    onStart={handleStart}
                                    onTour={exitToTour}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                )}
                </div>

                {busy && showOverlay && (
                    <BusyOverlay label={t("AiOnboardingLoading")} spin={!prefersReducedMotion} t={t} />
                )}
            </main>
        </div>
    );
}

interface ErrorBannerProps {
    onRetry: () => void;
    onTakeTour: () => void;
    t: (key: string) => string;
}

function ErrorBanner({ onRetry, onTakeTour, t }: ErrorBannerProps) {
    return (
        <div
            className="w-full max-w-md rounded-3xl border p-8 text-center shadow-lg"
            style={{
                backgroundColor: "color-mix(in srgb, var(--secondary) 6%, var(--background))",
                borderColor: "color-mix(in srgb, var(--primary) 20%, var(--background))"
            }}
        >
            <div
                className="mx-auto mb-5 flex w-14 h-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: "color-mix(in srgb, var(--primary) 12%, var(--background))" }}
            >
                <AlertTriangle className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-secondary mb-2">
                {t("AiOnboardingErrorTitle")}
            </h2>
            <p className="text-description mb-6">{t("AiOnboardingErrorDescription")}</p>
            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    type="button"
                    onClick={onRetry}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-semibold text-white hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                    <RotateCcw className="w-4 h-4" />
                    {t("AiOnboardingRetry")}
                </button>
                <button
                    type="button"
                    onClick={onTakeTour}
                    style={{ backgroundColor: "color-mix(in srgb, var(--secondary) 12%, var(--background))" }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-secondary hover:brightness-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                >
                    <Compass className="w-4 h-4" />
                    {t("AiOnboardingTakeTour")}
                </button>
            </div>
        </div>
    );
}

/** BeYou-mechanics tips rotated while the AI thinks, so waiting teaches the app. */
export const BUSY_TIP_KEYS = [
    "AiOnboardingTipXp",
    "AiOnboardingTipStreak",
    "AiOnboardingTipSkip",
    "AiOnboardingTipLevels",
    "AiOnboardingTipGoals",
    "AiOnboardingTipSchedule",
    "AiOnboardingTipAgent",
    "AiOnboardingTipWidgets",
];

const TIP_ROTATE_MS = 4_000;

// Module-level cursor: each new wait continues where the last one stopped,
// so short back-to-back loads don't always show the same first tip.
let tipCursor = 0;

export function BusyOverlay({ label, spin, t }: { label: string; spin: boolean; t: TFunction }) {
    const [tipIndex, setTipIndex] = useState(() => tipCursor % BUSY_TIP_KEYS.length);

    useEffect(() => {
        const interval = setInterval(() => {
            tipCursor += 1;
            setTipIndex(tipCursor % BUSY_TIP_KEYS.length);
        }, TIP_ROTATE_MS);
        return () => {
            tipCursor += 1; // next wait starts on a fresh tip
            clearInterval(interval);
        };
    }, []);

    return (
        <div
            className="fixed inset-0 z-20 flex flex-col items-center justify-center gap-4 px-6 backdrop-blur-sm"
            style={{ backgroundColor: "color-mix(in srgb, var(--background) 82%, transparent)" }}
        >
            <div className="relative flex items-center justify-center">
                <div
                    className={cn(
                        "h-14 w-14 rounded-full border-4 border-primary border-t-transparent",
                        spin && "animate-spin"
                    )}
                />
                <Sparkles className="absolute w-6 h-6 text-primary" />
            </div>
            <p className="text-secondary font-medium">{label}</p>

            <div className="mt-2 max-w-md text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {t("AiOnboardingTipLabel")}
                </p>
                <AnimatePresence mode="wait">
                    <motion.p
                        key={tipIndex}
                        initial={spin ? { opacity: 0, y: 6 } : undefined}
                        animate={{ opacity: 1, y: 0 }}
                        exit={spin ? { opacity: 0, y: -6 } : undefined}
                        transition={{ duration: 0.25 }}
                        className="mt-1 text-sm text-description"
                        data-testid="busy-tip"
                    >
                        {t(BUSY_TIP_KEYS[tipIndex])}
                    </motion.p>
                </AnimatePresence>
            </div>
        </div>
    );
}
