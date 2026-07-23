import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
    ArrowRight,
    CalendarDays,
    Lightbulb,
    ListChecks,
    Repeat,
    Sparkles,
    Wand2,
    X
} from "lucide-react";
import { useTranslation } from "react-i18next";
import clsx, { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
    ItemPlacement,
    RoutineSuggestion,
    SectionSuggestion
} from "@beyou/types/onboarding/suggestions";
import BeyouIcon from "../../../ui/BeyouIcon";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const WEEK_DAYS = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY"
] as const;

const MAX_STAGGER_DELAY = 0.4;

type ItemKind = "habits" | "tasks";

interface RoutineStepProps {
    suggestion: RoutineSuggestion;
    onAccept: (edited: RoutineSuggestion, days: string[]) => void;
    onRegenerate: (feedback: string) => void;
    loading: boolean;
}

/** Display sections as a chronological timeline regardless of the AI's ordering. */
const sortSections = (sections: SectionSuggestion[]): SectionSuggestion[] =>
    [...sections].sort((a, b) => a.startTime.localeCompare(b.startTime));

const withItems = (
    section: SectionSuggestion,
    kind: ItemKind,
    items: ItemPlacement[]
): SectionSuggestion =>
    kind === "habits" ? { ...section, habits: items } : { ...section, tasks: items };

export default function RoutineStep({
    suggestion,
    onAccept,
    onRegenerate,
    loading
}: RoutineStepProps) {
    const { t } = useTranslation();
    const prefersReducedMotion = useReducedMotion();

    const [draft, setDraft] = useState<RoutineSuggestion>(() => ({
        ...suggestion,
        sections: sortSections(suggestion.sections)
    }));
    const [selectedDays, setSelectedDays] = useState<ReadonlySet<string>>(
        () => new Set(suggestion.scheduleDays)
    );
    const [feedback, setFeedback] = useState("");

    // A regenerated suggestion replaces any local edits — the user asked for a new draft.
    useEffect(() => {
        setDraft({ ...suggestion, sections: sortSections(suggestion.sections) });
        setSelectedDays(new Set(suggestion.scheduleDays));
    }, [suggestion]);

    const moveItem = (kind: ItemKind, fromSection: number, itemIndex: number, toSection: number) => {
        if (toSection === fromSection) return;
        setDraft((prev) => {
            const item = prev.sections[fromSection][kind][itemIndex];
            if (!item) return prev;
            return {
                ...prev,
                sections: prev.sections.map((section, index) => {
                    if (index === fromSection) {
                        return withItems(section, kind, section[kind].filter((_, i) => i !== itemIndex));
                    }
                    if (index === toSection) {
                        // The item keeps its own times — only its section changes.
                        return withItems(section, kind, [...section[kind], item]);
                    }
                    return section;
                })
            };
        });
    };

    const removeItem = (kind: ItemKind, sectionIndex: number, itemIndex: number) => {
        setDraft((prev) => ({
            ...prev,
            sections: prev.sections.map((section, index) =>
                index === sectionIndex
                    ? withItems(section, kind, section[kind].filter((_, i) => i !== itemIndex))
                    : section
            )
        }));
    };

    const toggleDay = (day: string) => {
        setSelectedDays((prev) => {
            const next = new Set(prev);
            if (next.has(day)) next.delete(day);
            else next.add(day);
            return next;
        });
    };

    return (
        <div className="flex flex-col items-center gap-8 md:gap-10 w-full max-w-3xl mx-auto">
            {/* Header */}
            <div className="space-y-3 text-center">
                <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary rounded-full px-3 py-1"
                    style={{ backgroundColor: "color-mix(in srgb, var(--primary) 12%, var(--background))" }}
                >
                    <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                    {t("AiOnboardingStepRoutine")}
                </span>
                <h2 className="text-2xl md:text-4xl font-semibold text-secondary leading-tight px-2">
                    {t("AiOnboardingRoutineTitle")}
                </h2>
                <div className="flex items-center justify-center gap-2">
                    <span
                        className="flex w-8 h-8 items-center justify-center rounded-xl"
                        style={{ backgroundColor: "color-mix(in srgb, var(--primary) 12%, var(--background))" }}
                    >
                        <BeyouIcon id={draft.iconId} size={18} className="text-primary" showFallback />
                    </span>
                    <span className="text-lg font-semibold text-secondary">{draft.name}</span>
                </div>
                <p
                    className="inline-flex items-start sm:items-center gap-2 text-left text-sm md:text-base text-secondary rounded-2xl px-4 py-2.5 max-w-xl mx-auto"
                    style={{
                        backgroundColor: "color-mix(in srgb, var(--primary) 8%, var(--background))",
                        border: "1px solid color-mix(in srgb, var(--primary) 18%, var(--background))"
                    }}
                >
                    <Lightbulb className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0 text-primary" aria-hidden="true" />
                    <span>{t("AiOnboardingRoutineHint")}</span>
                </p>
            </div>

            {/* Timeline of sections */}
            <div className="relative w-full max-w-2xl">
                <div
                    aria-hidden="true"
                    className="absolute left-[7px] top-4 bottom-4 w-0.5 rounded-full"
                    style={{ backgroundColor: "color-mix(in srgb, var(--primary) 25%, var(--background))" }}
                />
                <ol className="space-y-4">
                    {draft.sections.map((section, sectionIndex) => (
                        <motion.li
                            key={`${section.name}-${section.startTime}`}
                            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                duration: 0.3,
                                ease: "easeOut",
                                delay: Math.min(sectionIndex * 0.08, MAX_STAGGER_DELAY)
                            }}
                            className="relative pl-8"
                        >
                            {/* Timeline dot */}
                            <span
                                aria-hidden="true"
                                className="absolute left-0 top-6 h-4 w-4 rounded-full border-2 border-[var(--primary)]"
                                style={{ backgroundColor: "var(--background)" }}
                            />

                            <section
                                className="rounded-2xl border p-4 shadow-sm"
                                style={{
                                    backgroundColor: "color-mix(in srgb, var(--secondary) 5%, var(--background))",
                                    borderColor: "color-mix(in srgb, var(--primary) 16%, var(--background))"
                                }}
                            >
                                <header className="flex items-center gap-2.5">
                                    <span
                                        className="flex w-9 h-9 shrink-0 items-center justify-center rounded-xl"
                                        style={{ backgroundColor: "color-mix(in srgb, var(--primary) 10%, var(--background))" }}
                                    >
                                        <BeyouIcon id={section.iconId} size={18} className="text-primary" showFallback />
                                    </span>
                                    <h3 className="flex-1 min-w-0 truncate font-semibold text-secondary">
                                        {section.name}
                                    </h3>
                                    <span className="shrink-0 text-sm font-semibold text-primary tabular-nums">
                                        {section.startTime}
                                        <span className="text-description font-normal mx-0.5">–</span>
                                        {section.endTime}
                                    </span>
                                </header>

                                {(section.habits.length > 0 || section.tasks.length > 0) && (
                                    <ul className="mt-3 space-y-1.5">
                                        {section.habits.map((item, itemIndex) => (
                                            <ItemRow
                                                key={`h-${item.name}-${itemIndex}`}
                                                kind="habits"
                                                item={item}
                                                sectionIndex={sectionIndex}
                                                itemIndex={itemIndex}
                                                sections={draft.sections}
                                                onMove={moveItem}
                                                onRemove={removeItem}
                                                t={t}
                                            />
                                        ))}
                                        {section.tasks.map((item, itemIndex) => (
                                            <ItemRow
                                                key={`t-${item.name}-${itemIndex}`}
                                                kind="tasks"
                                                item={item}
                                                sectionIndex={sectionIndex}
                                                itemIndex={itemIndex}
                                                sections={draft.sections}
                                                onMove={moveItem}
                                                onRemove={removeItem}
                                                t={t}
                                            />
                                        ))}
                                    </ul>
                                )}
                            </section>
                        </motion.li>
                    ))}
                </ol>
            </div>

            {/* Weekday schedule pills */}
            <div className="flex flex-col items-center gap-3">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-description">
                    <CalendarDays className="w-4 h-4 text-primary" aria-hidden="true" />
                    {t("AiOnboardingScheduleDays")}
                </span>
                <div className="flex flex-wrap justify-center gap-1.5">
                    {WEEK_DAYS.map((day) => {
                        const active = selectedDays.has(day);
                        return (
                            <button
                                key={day}
                                type="button"
                                aria-pressed={active}
                                aria-label={day}
                                onClick={() => toggleDay(day)}
                                style={
                                    active
                                        ? undefined
                                        : {
                                              backgroundColor:
                                                  "color-mix(in srgb, var(--secondary) 8%, var(--background))"
                                          }
                                }
                                className={cn(
                                    "flex w-11 h-11 items-center justify-center rounded-full text-xs font-bold transition-all",
                                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                    active
                                        ? "bg-primary text-white shadow-md"
                                        : "text-secondary hover:brightness-95"
                                )}
                            >
                                <span aria-hidden="true">{day.slice(0, 3)}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Feedback + actions */}
            <div className="w-full max-w-md space-y-3">
                <div className="flex items-stretch gap-2">
                    <input
                        type="text"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !loading) {
                                e.preventDefault();
                                onRegenerate(feedback.trim());
                            }
                        }}
                        placeholder={t("AiOnboardingRoutineFeedbackPlaceholder")}
                        style={{ borderColor: "color-mix(in srgb, var(--primary) 22%, var(--background))" }}
                        className="flex-1 min-w-0 rounded-xl border bg-background px-4 py-2.5 text-secondary placeholder:text-description focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                    />
                    <button
                        type="button"
                        onClick={() => onRegenerate(feedback.trim())}
                        disabled={loading}
                        style={{ backgroundColor: "color-mix(in srgb, var(--secondary) 12%, var(--background))" }}
                        className={cn(
                            "flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 font-semibold text-secondary transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                            loading ? "opacity-60 cursor-wait" : "hover:brightness-95"
                        )}
                    >
                        <Wand2 className="w-4 h-4" aria-hidden="true" />
                        <span>{t("AiOnboardingRoutineRegenerate")}</span>
                    </button>
                </div>

                <button
                    type="button"
                    onClick={() =>
                        onAccept(
                            draft,
                            WEEK_DAYS.filter((day) => selectedDays.has(day))
                        )
                    }
                    disabled={loading}
                    className={cn(
                        "flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white transition-all",
                        loading
                            ? "bg-primary opacity-40 cursor-not-allowed"
                            : "bg-primary hover:opacity-90 hover:-translate-y-0.5 shadow-lg"
                    )}
                >
                    {t("AiOnboardingRoutineAccept")}
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}

interface ItemRowProps {
    kind: ItemKind;
    item: ItemPlacement;
    sectionIndex: number;
    itemIndex: number;
    sections: SectionSuggestion[];
    onMove: (kind: ItemKind, fromSection: number, itemIndex: number, toSection: number) => void;
    onRemove: (kind: ItemKind, sectionIndex: number, itemIndex: number) => void;
    t: (key: string) => string;
}

/** One habit/task placement row: type glyph, name, times, move-to-section select, remove. */
function ItemRow({ kind, item, sectionIndex, itemIndex, sections, onMove, onRemove, t }: ItemRowProps) {
    const Glyph = kind === "habits" ? Repeat : ListChecks;
    return (
        <li
            className="flex items-center gap-2 rounded-xl px-2.5 py-2"
            style={{ backgroundColor: "color-mix(in srgb, var(--background) 60%, transparent)" }}
        >
            <span
                className="flex w-7 h-7 shrink-0 items-center justify-center rounded-lg"
                style={{
                    backgroundColor: `color-mix(in srgb, var(${
                        kind === "habits" ? "--primary" : "--secondary"
                    }) 10%, var(--background))`
                }}
            >
                <Glyph
                    className={cn("w-3.5 h-3.5", kind === "habits" ? "text-primary" : "text-secondary")}
                    aria-hidden="true"
                />
            </span>
            <span className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:gap-2">
                <span className="truncate text-sm font-medium text-secondary">{item.name}</span>
                <span className="shrink-0 text-xs text-description tabular-nums">
                    {item.startTime}–{item.endTime}
                </span>
            </span>
            <select
                aria-label={t("AiOnboardingMoveToSection")}
                value={sectionIndex}
                onChange={(e) => onMove(kind, sectionIndex, itemIndex, Number(e.target.value))}
                style={{ borderColor: "color-mix(in srgb, var(--primary) 18%, var(--background))" }}
                className="max-w-28 shrink-0 truncate rounded-lg border bg-background px-1.5 py-1 text-xs text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            >
                {sections.map((section, index) => (
                    <option key={`${section.name}-${index}`} value={index}>
                        {section.name}
                    </option>
                ))}
            </select>
            <button
                type="button"
                aria-label={t("AiOnboardingRemoveItem")}
                onClick={() => onRemove(kind, sectionIndex, itemIndex)}
                className="flex w-7 h-7 shrink-0 items-center justify-center rounded-lg text-description hover:text-primary hover:bg-background transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
                <X className="w-4 h-4" aria-hidden="true" />
            </button>
        </li>
    );
}
