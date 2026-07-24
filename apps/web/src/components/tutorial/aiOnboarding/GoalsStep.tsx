import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCheck, Loader2, Plus, Sparkles, Target } from "lucide-react";
import { useTranslation } from "react-i18next";
import clsx, { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { GoalSuggestion } from "@beyou/types/onboarding/suggestions";
import SuggestionCard from "./SuggestionCard";
import { CreatedRef } from "./createFromSuggestions";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface GoalsStepProps {
    categories: CreatedRef[];
    initial: GoalSuggestion[];
    loading: boolean;
    fetchMore: (newRequest: string) => Promise<GoalSuggestion[]>;
    onContinue: (selected: GoalSuggestion[]) => void;
}

const MAX_STAGGER_DELAY = 0.4;

const TERM_LABEL_KEYS: Record<GoalSuggestion["term"], string> = {
    SHORT_TERM: "Short Term",
    MEDIUM_TERM: "Medium Term",
    LONG_TERM: "Long Term"
};

export default function GoalsStep({
    categories,
    initial,
    loading,
    fetchMore,
    onContinue
}: GoalsStepProps) {
    const { t } = useTranslation();
    const prefersReducedMotion = useReducedMotion();

    const [goals, setGoals] = useState<GoalSuggestion[]>(initial);
    const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
    const [freeInput, setFreeInput] = useState("");
    const [adding, setAdding] = useState(false);

    const toggle = (name: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    const toggleAll = () => {
        const allSelected = goals.length > 0 && goals.every((g) => selected.has(g.name));
        setSelected(allSelected ? new Set() : new Set(goals.map((g) => g.name)));
    };

    const addFreeText = async () => {
        const value = freeInput.trim();
        if (!value || adding || loading) return;
        setAdding(true);
        try {
            const fetched = await fetchMore(value);
            setGoals((prev) => [
                ...prev,
                ...fetched.filter((g) => !prev.some((e) => e.name === g.name))
            ]);
            // Fetched items arrive pre-selected — the user explicitly asked for them.
            setSelected((prev) => new Set([...prev, ...fetched.map((g) => g.name)]));
            setFreeInput("");
        } catch {
            // The wizard surfaces the shared error banner; keep the input for a retry.
        } finally {
            setAdding(false);
        }
    };

    const displayCategory = (categoryName: string) =>
        categories.find((c) => c.name.toLowerCase() === categoryName?.toLowerCase())?.name ??
        categoryName;

    const canContinue = !loading && !adding;

    return (
        <div className="flex flex-col items-center gap-8 md:gap-10 w-full max-w-4xl mx-auto">
            {/* Header */}
            <div className="space-y-3 text-center">
                <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary rounded-full px-3 py-1"
                    style={{ backgroundColor: "color-mix(in srgb, var(--primary) 12%, var(--background))" }}
                >
                    <Sparkles className="w-3.5 h-3.5" />
                    {t("AiOnboardingStepGoals")}
                </span>
                <h2 className="text-2xl md:text-4xl font-semibold text-secondary leading-tight px-2">
                    {t("AiOnboardingGoalsTitle")}
                </h2>
                <p className="text-description max-w-xl mx-auto">{t("AiOnboardingGoalsHint")}</p>
            </div>

            {/* Goal cards */}
            {goals.length > 0 && (
                <section className="w-full space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span
                                className="flex w-7 h-7 items-center justify-center rounded-lg"
                                style={{
                                    backgroundColor:
                                        "color-mix(in srgb, var(--primary) 12%, var(--background))"
                                }}
                            >
                                <Target className="w-4 h-4 text-primary" />
                            </span>
                            <h3 className="text-lg font-semibold text-secondary">
                                {t("AiOnboardingSummaryGoals")}
                            </h3>
                            <span className="text-xs font-medium text-description tabular-nums">
                                {selected.size}/{goals.length}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={toggleAll}
                            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-primary hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            <CheckCheck className="w-4 h-4" aria-hidden="true" />
                            {t("AiOnboardingSelectAll")}
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <AnimatePresence>
                            {goals.map((goal, index) => (
                                <motion.div
                                    key={goal.name}
                                    initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        duration: 0.3,
                                        ease: "easeOut",
                                        delay: Math.min(index * 0.05, MAX_STAGGER_DELAY)
                                    }}
                                >
                                    <SuggestionCard
                                        name={goal.name}
                                        description={goal.description}
                                        iconId={goal.iconId}
                                        selected={selected.has(goal.name)}
                                        onToggle={() => toggle(goal.name)}
                                        meta={
                                            <GoalMeta
                                                category={displayCategory(goal.categoryName)}
                                                targetValue={goal.targetValue}
                                                unit={goal.unit}
                                                termLabel={t(TERM_LABEL_KEYS[goal.term])}
                                            />
                                        }
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </section>
            )}

            {/* Free input + continue */}
            <div className="w-full max-w-md space-y-4">
                <div className="flex items-stretch gap-2">
                    <input
                        type="text"
                        value={freeInput}
                        onChange={(e) => setFreeInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                void addFreeText();
                            }
                        }}
                        placeholder={t("AiOnboardingFreeInputPlaceholder")}
                        style={{ borderColor: "color-mix(in srgb, var(--primary) 22%, var(--background))" }}
                        className="min-w-0 flex-1 rounded-xl border bg-background px-4 py-2.5 text-secondary placeholder:text-description focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                    />
                    <button
                        type="button"
                        onClick={() => void addFreeText()}
                        disabled={adding}
                        aria-label={t("AiOnboardingAdd")}
                        style={{ backgroundColor: "color-mix(in srgb, var(--secondary) 12%, var(--background))" }}
                        className={cn(
                            "flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 font-semibold text-secondary transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                            adding ? "opacity-60 cursor-wait" : "hover:brightness-95"
                        )}
                    >
                        {adding ? (
                            <Loader2 className={cn("w-4 h-4", !prefersReducedMotion && "animate-spin")} />
                        ) : (
                            <Plus className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">{t("AiOnboardingAdd")}</span>
                    </button>
                </div>

                <button
                    type="button"
                    onClick={() => onContinue(goals.filter((g) => selected.has(g.name)))}
                    disabled={!canContinue}
                    className={cn(
                        "flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white transition-all",
                        canContinue
                            ? "bg-primary hover:opacity-90 hover:-translate-y-0.5 shadow-lg"
                            : "bg-primary opacity-40 cursor-not-allowed"
                    )}
                >
                    {t("AiOnboardingContinue")}
                    {selected.size > 0 && (
                        <span
                            className="flex min-w-5 h-5 items-center justify-center rounded-full px-1.5 text-xs font-bold text-primary bg-white"
                            aria-hidden="true"
                        >
                            {selected.size}
                        </span>
                    )}
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

function GoalMeta({
    category,
    targetValue,
    unit,
    termLabel
}: {
    category: string;
    targetValue: number;
    unit: string;
    termLabel: string;
}) {
    return (
        <span className="flex flex-col items-end gap-1" aria-hidden="true">
            <span className="max-w-24 truncate text-[10px] font-semibold uppercase tracking-wide text-primary">
                {category}
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-secondary tabular-nums">
                <Target className="w-3 h-3 text-primary" />
                {targetValue} {unit}
            </span>
            <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-secondary"
                style={{ backgroundColor: "color-mix(in srgb, var(--secondary) 10%, var(--background))" }}
            >
                {termLabel}
            </span>
        </span>
    );
}
