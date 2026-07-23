import { ReactNode, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
    ArrowRight,
    CheckCheck,
    Lightbulb,
    ListChecks,
    Loader2,
    Plus,
    Repeat,
    Sparkles,
    Star,
    Zap
} from "lucide-react";
import { useTranslation } from "react-i18next";
import clsx, { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { HabitSuggestion, TaskSuggestion } from "@beyou/types/onboarding/suggestions";
import SuggestionCard from "./SuggestionCard";
import { CreatedRef } from "./createFromSuggestions";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export type HabitsTasksSelection = {
    habits: HabitSuggestion[];
    tasks: TaskSuggestion[];
    freeTexts: string[];
};

interface HabitsTasksStepProps {
    categories: CreatedRef[];
    initial: { habits: HabitSuggestion[]; tasks: TaskSuggestion[] };
    loading: boolean;
    fetchMore: (newRequest: string) => Promise<{ habits: HabitSuggestion[]; tasks: TaskSuggestion[] }>;
    onContinue: (sel: HabitsTasksSelection) => void;
}

const MAX_STAGGER_DELAY = 0.4;

export default function HabitsTasksStep({
    categories,
    initial,
    loading,
    fetchMore,
    onContinue
}: HabitsTasksStepProps) {
    const { t } = useTranslation();
    const prefersReducedMotion = useReducedMotion();

    const [habits, setHabits] = useState<HabitSuggestion[]>(initial.habits);
    const [tasks, setTasks] = useState<TaskSuggestion[]>(initial.tasks);
    const [selectedHabits, setSelectedHabits] = useState<ReadonlySet<string>>(new Set());
    const [selectedTasks, setSelectedTasks] = useState<ReadonlySet<string>>(new Set());
    const [freeTexts, setFreeTexts] = useState<string[]>([]);
    const [freeInput, setFreeInput] = useState("");
    const [adding, setAdding] = useState(false);

    const toggleIn = (prev: ReadonlySet<string>, name: string): ReadonlySet<string> => {
        const next = new Set(prev);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        return next;
    };

    const toggleAll = (
        items: Array<{ name: string }>,
        selected: ReadonlySet<string>,
        setSelected: (next: ReadonlySet<string>) => void
    ) => {
        const allSelected = items.length > 0 && items.every((item) => selected.has(item.name));
        setSelected(allSelected ? new Set() : new Set(items.map((item) => item.name)));
    };

    const addFreeText = async () => {
        const value = freeInput.trim();
        if (!value || adding || loading) return;
        setAdding(true);
        try {
            const res = await fetchMore(value);
            setHabits((prev) => [
                ...prev,
                ...res.habits.filter((h) => !prev.some((e) => e.name === h.name))
            ]);
            setTasks((prev) => [
                ...prev,
                ...res.tasks.filter((newTask) => !prev.some((e) => e.name === newTask.name))
            ]);
            // Fetched items arrive pre-selected — the user explicitly asked for them.
            setSelectedHabits((prev) => new Set([...prev, ...res.habits.map((h) => h.name)]));
            setSelectedTasks((prev) => new Set([...prev, ...res.tasks.map((task) => task.name)]));
            setFreeTexts((prev) => [...prev, value]);
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

    const selectedCount = selectedHabits.size + selectedTasks.size;
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
                    {t("AiOnboardingStepHabitsTasks")}
                </span>
                <h2 className="text-2xl md:text-4xl font-semibold text-secondary leading-tight px-2">
                    {t("AiOnboardingHabitsTasksTitle")}
                </h2>
                {/* Teaching moment: what makes a habit different from a task */}
                <p
                    className="inline-flex items-start sm:items-center gap-2 text-left text-sm md:text-base text-secondary rounded-2xl px-4 py-2.5 max-w-xl mx-auto"
                    style={{
                        backgroundColor: "color-mix(in srgb, var(--primary) 8%, var(--background))",
                        border: "1px solid color-mix(in srgb, var(--primary) 18%, var(--background))"
                    }}
                >
                    <Lightbulb className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0 text-primary" />
                    <span>{t("AiOnboardingHabitsTasksHint")}</span>
                </p>
            </div>

            {/* Habits group */}
            {habits.length > 0 && (
                <SuggestionGroup
                    labelKey="AiOnboardingHabitsLabel"
                    icon={<Repeat className="w-4 h-4 text-primary" />}
                    tintVar="--primary"
                    selectedCount={selectedHabits.size}
                    total={habits.length}
                    onToggleAll={() => toggleAll(habits, selectedHabits, setSelectedHabits)}
                    t={t}
                >
                    {habits.map((habit, index) => (
                        <CardEntrance
                            key={habit.name}
                            index={index}
                            prefersReducedMotion={prefersReducedMotion}
                        >
                            <SuggestionCard
                                name={habit.name}
                                description={habit.description}
                                iconId={habit.iconId}
                                selected={selectedHabits.has(habit.name)}
                                onToggle={() =>
                                    setSelectedHabits((prev) => toggleIn(prev, habit.name))
                                }
                                meta={
                                    <CardMeta
                                        category={displayCategory(habit.categoryName)}
                                        importance={habit.importance}
                                        difficulty={habit.difficulty}
                                    />
                                }
                            />
                        </CardEntrance>
                    ))}
                </SuggestionGroup>
            )}

            {/* Tasks group */}
            {tasks.length > 0 && (
                <SuggestionGroup
                    labelKey="AiOnboardingTasksLabel"
                    icon={<ListChecks className="w-4 h-4 text-secondary" />}
                    tintVar="--secondary"
                    selectedCount={selectedTasks.size}
                    total={tasks.length}
                    onToggleAll={() => toggleAll(tasks, selectedTasks, setSelectedTasks)}
                    t={t}
                >
                    {tasks.map((task, index) => (
                        <CardEntrance
                            key={task.name}
                            index={index}
                            prefersReducedMotion={prefersReducedMotion}
                        >
                            <SuggestionCard
                                name={task.name}
                                description={task.description}
                                iconId={task.iconId}
                                selected={selectedTasks.has(task.name)}
                                onToggle={() =>
                                    setSelectedTasks((prev) => toggleIn(prev, task.name))
                                }
                                meta={
                                    <CardMeta
                                        category={displayCategory(task.categoryName)}
                                        importance={task.importance}
                                        difficulty={task.difficulty}
                                    />
                                }
                            />
                        </CardEntrance>
                    ))}
                </SuggestionGroup>
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
                        className="flex-1 rounded-xl border bg-background px-4 py-2.5 text-secondary placeholder:text-description focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                    />
                    <button
                        type="button"
                        onClick={() => void addFreeText()}
                        disabled={adding}
                        aria-label={t("AiOnboardingAdd")}
                        style={{ backgroundColor: "color-mix(in srgb, var(--secondary) 12%, var(--background))" }}
                        className={cn(
                            "flex items-center gap-1.5 rounded-xl px-4 py-2.5 font-semibold text-secondary transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
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
                    onClick={() =>
                        onContinue({
                            habits: habits.filter((h) => selectedHabits.has(h.name)),
                            tasks: tasks.filter((task) => selectedTasks.has(task.name)),
                            freeTexts
                        })
                    }
                    disabled={!canContinue}
                    className={cn(
                        "flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white transition-all",
                        canContinue
                            ? "bg-primary hover:opacity-90 hover:-translate-y-0.5 shadow-lg"
                            : "bg-primary opacity-40 cursor-not-allowed"
                    )}
                >
                    {t("AiOnboardingContinue")}
                    {selectedCount > 0 && (
                        <span
                            className="flex min-w-5 h-5 items-center justify-center rounded-full px-1.5 text-xs font-bold text-primary bg-white"
                            aria-hidden="true"
                        >
                            {selectedCount}
                        </span>
                    )}
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

interface SuggestionGroupProps {
    labelKey: string;
    icon: ReactNode;
    tintVar: "--primary" | "--secondary";
    selectedCount: number;
    total: number;
    onToggleAll: () => void;
    t: (key: string) => string;
    children: ReactNode;
}

function SuggestionGroup({
    labelKey,
    icon,
    tintVar,
    selectedCount,
    total,
    onToggleAll,
    t,
    children
}: SuggestionGroupProps) {
    return (
        <section className="w-full space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span
                        className="flex w-7 h-7 items-center justify-center rounded-lg"
                        style={{
                            backgroundColor: `color-mix(in srgb, var(${tintVar}) 12%, var(--background))`
                        }}
                    >
                        {icon}
                    </span>
                    <h3 className="text-lg font-semibold text-secondary">{t(labelKey)}</h3>
                    <span className="text-xs font-medium text-description tabular-nums">
                        {selectedCount}/{total}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={onToggleAll}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-primary hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                    <CheckCheck className="w-4 h-4" aria-hidden="true" />
                    {t("AiOnboardingSelectAll")}
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <AnimatePresence>{children}</AnimatePresence>
            </div>
        </section>
    );
}

function CardEntrance({
    index,
    prefersReducedMotion,
    children
}: {
    index: number;
    prefersReducedMotion: boolean | null;
    children: ReactNode;
}) {
    return (
        <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.3,
                ease: "easeOut",
                delay: Math.min(index * 0.05, MAX_STAGGER_DELAY)
            }}
        >
            {children}
        </motion.div>
    );
}

function CardMeta({
    category,
    importance,
    difficulty
}: {
    category: string;
    importance: number;
    difficulty: number;
}) {
    return (
        <span className="flex flex-col items-end gap-1" aria-hidden="true">
            <span className="max-w-24 truncate text-[10px] font-semibold uppercase tracking-wide text-primary">
                {category}
            </span>
            <DotRow icon={<Star className="w-3 h-3 text-primary" />} count={importance} filledClass="bg-primary" />
            <DotRow icon={<Zap className="w-3 h-3 text-secondary" />} count={difficulty} filledClass="bg-secondary" />
        </span>
    );
}

function DotRow({
    icon,
    count,
    filledClass
}: {
    icon: ReactNode;
    count: number;
    filledClass: string;
}) {
    return (
        <span className="flex items-center gap-1">
            {icon}
            <span className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((level) => (
                    <span
                        key={level}
                        className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            level <= count ? filledClass : "bg-description opacity-30"
                        )}
                    />
                ))}
            </span>
        </span>
    );
}
