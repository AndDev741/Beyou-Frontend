import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles, AlertTriangle, RotateCcw, Compass } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import clsx, { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import fetchOnboardingSuggestions from "@beyou/api/onboarding/fetchOnboardingSuggestions";
import {
    HabitSuggestion,
    RoutineSuggestion,
    TaskSuggestion
} from "@beyou/types/onboarding/suggestions";
import CategoriesStep from "./CategoriesStep";
import HabitsTasksStep, { HabitsTasksSelection } from "./HabitsTasksStep";
import RoutineStep from "./RoutineStep";
import {
    createCategoriesFromSuggestions,
    createHabitsFromSuggestions,
    createRoutineFromSuggestion,
    createTasksFromSuggestions,
    CreatedRef
} from "./createFromSuggestions";

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

    const [step, setStep] = useState<WizardStep>("categories");
    const [data, setData] = useState<WizardData>({
        categories: [],
        habits: [],
        tasks: [],
        goals: [],
        freeTexts: []
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suggestedHabitsTasks, setSuggestedHabitsTasks] = useState<{
        habits: HabitSuggestion[];
        tasks: TaskSuggestion[];
    } | null>(null);
    const [suggestedRoutine, setSuggestedRoutine] = useState<RoutineSuggestion | null>(null);

    // Holds the last failed async action so the error banner's Retry can re-run it.
    const retryRef = useRef<(() => Promise<void>) | null>(null);
    // Guards the habitsTasks initial fetch so it only fires once per wizard run.
    const habitsTasksRequested = useRef(false);
    // Same one-shot guard for the routine draft fetch.
    const routineRequested = useRef(false);

    const runGuarded = async (action: () => Promise<void>) => {
        retryRef.current = action;
        setBusy(true);
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
        void runGuarded(fetchRoutineSuggestion(feedback || undefined));
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

    const handleRetry = () => {
        if (retryRef.current) void runGuarded(retryRef.current);
    };

    const currentIndex = STEP_ORDER.indexOf(step);

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--background)] overflow-y-auto">
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
                        onClick={onTakeTour}
                        className="flex items-center gap-1.5 text-sm font-semibold text-secondary hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg px-2 py-1"
                    >
                        <Compass className="w-4 h-4" />
                        <span className="hidden sm:inline">{t("AiOnboardingTakeTour")}</span>
                    </button>
                </div>
            </header>

            {/* Step body */}
            <main className="relative flex-1 flex items-center justify-center px-4 md:px-8 py-6">
                {error ? (
                    <ErrorBanner
                        onRetry={handleRetry}
                        onTakeTour={onFallbackToManual}
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
                            {step === "goals" && (
                                <div data-testid="ai-onboarding-goals-placeholder" />
                            )}
                            {step === "summary" && (
                                <div
                                    data-testid="ai-onboarding-summary-placeholder"
                                    className="flex flex-col items-center gap-6 text-center"
                                >
                                    <h2 className="text-2xl md:text-3xl font-semibold text-secondary">
                                        {t("AiOnboardingSummaryTitle")}
                                    </h2>
                                    <p className="text-description max-w-md">
                                        {t("AiOnboardingSummaryDescription")}
                                    </p>
                                    <p className="text-sm text-description">
                                        {t("AiOnboardingSummaryCategories")}: {data.categories.length}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => void onFinish()}
                                        className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-white hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        {t("AiOnboardingStart")}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                )}

                {busy && <BusyOverlay label={t("AiOnboardingLoading")} spin={!prefersReducedMotion} />}
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

function BusyOverlay({ label, spin }: { label: string; spin: boolean }) {
    return (
        <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 backdrop-blur-sm"
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
        </div>
    );
}
