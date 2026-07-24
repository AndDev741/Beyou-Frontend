import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
    ArrowRight,
    CalendarDays,
    ChevronDown,
    ChevronUp,
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
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
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

/** One display row: which array the item lives in plus its index there. */
type SectionEntry = { kind: ItemKind; item: ItemPlacement; index: number };

/** Habits and tasks merged into ONE chronological list — the real routine
 *  orders items by time, so the draft must too (and reordering means
 *  exchanging time slots, not array positions). */
const sectionEntries = (section: SectionSuggestion): SectionEntry[] =>
    [
        ...section.habits.map((item, index) => ({ kind: "habits" as const, item, index })),
        ...section.tasks.map((item, index) => ({ kind: "tasks" as const, item, index }))
    ].sort((a, b) => a.item.startTime.localeCompare(b.item.startTime));

const toMinutes = (hhmm: string): number => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm ?? "");
    return match ? Number(match[1]) * 60 + Number(match[2]) : NaN;
};

const toHHMM = (minutes: number): string => {
    const clamped = Math.max(0, Math.min(23 * 60 + 59, minutes));
    return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
};

/** Puts `second` before `first` in time, keeping each item's duration and the
 *  original starting point. Malformed times fall back to a plain window swap. */
const swapChronology = (
    first: ItemPlacement,
    second: ItemPlacement
): { newFirst: ItemPlacement; newSecond: ItemPlacement } => {
    const start = toMinutes(first.startTime);
    const durFirst = toMinutes(first.endTime) - toMinutes(first.startTime);
    const durSecond = toMinutes(second.endTime) - toMinutes(second.startTime);
    if ([start, durFirst, durSecond].some(Number.isNaN)) {
        return {
            newFirst: { ...first, startTime: second.startTime, endTime: second.endTime },
            newSecond: { ...second, startTime: first.startTime, endTime: first.endTime }
        };
    }
    const newSecond = { ...second, startTime: toHHMM(start), endTime: toHHMM(start + durSecond) };
    const newFirst = {
        ...first,
        startTime: newSecond.endTime,
        endTime: toHHMM(start + durSecond + durFirst)
    };
    return { newFirst, newSecond };
};

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
        // A new draft means the regenerate request succeeded — clear the ask.
        setFeedback("");
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

    /** Swap this item's time slot with its chronological neighbor in the section. */
    const reorderItem = (
        kind: ItemKind,
        sectionIndex: number,
        itemIndex: number,
        direction: -1 | 1
    ) => {
        setDraft((prev) => {
            const section = prev.sections[sectionIndex];
            if (!section) return prev;
            const entries = sectionEntries(section);
            const pos = entries.findIndex((e) => e.kind === kind && e.index === itemIndex);
            const neighborPos = pos + direction;
            if (pos === -1 || neighborPos < 0 || neighborPos >= entries.length) return prev;
            const earlier = entries[Math.min(pos, neighborPos)];
            const later = entries[Math.max(pos, neighborPos)];
            const { newFirst, newSecond } = swapChronology(earlier.item, later.item);
            const updateEntry = (items: ItemPlacement[], entry: SectionEntry, next: ItemPlacement) =>
                items.map((item, i) => (i === entry.index ? next : item));
            let updated = section;
            updated = withItems(
                updated,
                earlier.kind,
                updateEntry(updated[earlier.kind], earlier, newFirst)
            );
            updated = withItems(
                updated,
                later.kind,
                updateEntry(updated[later.kind], later, newSecond)
            );
            return {
                ...prev,
                sections: prev.sections.map((s, i) => (i === sectionIndex ? updated : s))
            };
        });
    };

    /** Edit an item's start/end time in place. Empty values (mid-edit) are ignored. */
    const setItemTime = (
        kind: ItemKind,
        sectionIndex: number,
        itemIndex: number,
        field: "startTime" | "endTime",
        value: string
    ) => {
        if (!value) return;
        setDraft((prev) => ({
            ...prev,
            sections: prev.sections.map((section, i) =>
                i === sectionIndex
                    ? withItems(
                          section,
                          kind,
                          section[kind].map((item, j) =>
                              j === itemIndex ? { ...item, [field]: value } : item
                          )
                      )
                    : section
            )
        }));
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
        <div className="flex flex-col items-center gap-8 md:gap-10 w-full max-w-3xl lg:max-w-5xl mx-auto">
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
            <div className="relative w-full max-w-2xl md:max-w-3xl lg:max-w-4xl">
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
                                        {sectionEntries(section).map((entry, pos, entries) => (
                                            <ItemRow
                                                key={`${entry.kind}-${entry.item.name}-${entry.index}`}
                                                kind={entry.kind}
                                                item={entry.item}
                                                sectionIndex={sectionIndex}
                                                itemIndex={entry.index}
                                                sections={draft.sections}
                                                canMoveEarlier={pos > 0}
                                                canMoveLater={pos < entries.length - 1}
                                                onReorder={reorderItem}
                                                onTimeChange={setItemTime}
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
                        <Wand2
                            className={cn("w-4 h-4", loading && "animate-spin")}
                            aria-hidden="true"
                        />
                        <span>{loading ? t("AiOnboardingLoading") : t("AiOnboardingRoutineRegenerate")}</span>
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
    canMoveEarlier: boolean;
    canMoveLater: boolean;
    onReorder: (kind: ItemKind, sectionIndex: number, itemIndex: number, direction: -1 | 1) => void;
    onTimeChange: (
        kind: ItemKind,
        sectionIndex: number,
        itemIndex: number,
        field: "startTime" | "endTime",
        value: string
    ) => void;
    onMove: (kind: ItemKind, fromSection: number, itemIndex: number, toSection: number) => void;
    onRemove: (kind: ItemKind, sectionIndex: number, itemIndex: number) => void;
    t: (key: string) => string;
}

/** One habit/task placement row: type glyph, name, times, reorder arrows,
 *  move-to-section select, remove. */
function ItemRow({
    kind,
    item,
    sectionIndex,
    itemIndex,
    sections,
    canMoveEarlier,
    canMoveLater,
    onReorder,
    onTimeChange,
    onMove,
    onRemove,
    t
}: ItemRowProps) {
    const Glyph = kind === "habits" ? Repeat : ListChecks;
    const arrowClass = (enabled: boolean) =>
        cn(
            "flex w-7 h-7 shrink-0 items-center justify-center rounded-lg text-description transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            enabled ? "hover:text-primary hover:bg-background" : "opacity-30 cursor-default"
        );
    const timeInputClass =
        "shrink-0 rounded-lg border bg-background px-1.5 py-1 text-xs text-secondary tabular-nums focus:outline-none focus:ring-2 focus:ring-primary";
    const timeInputStyle = { borderColor: "color-mix(in srgb, var(--primary) 18%, var(--background))" };
    return (
        // Mobile: three tiers — name + remove on top, times in the middle,
        // reorder bottom-left / section bottom-right. Desktop (md+): one line;
        // the head wrapper dissolves (md:contents) and md:order-* re-slots its
        // children so the remove button lands at the row's end.
        <li
            className="flex flex-col gap-1.5 rounded-xl px-2.5 py-2 md:flex-row md:items-center md:gap-2"
            style={{ backgroundColor: "color-mix(in srgb, var(--background) 60%, transparent)" }}
        >
            <span className="flex items-center gap-2 md:contents">
                <span
                    className="flex w-7 h-7 shrink-0 items-center justify-center rounded-lg md:order-1"
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
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-secondary md:order-2">
                    {item.name}
                </span>
                <button
                    type="button"
                    aria-label={t("AiOnboardingRemoveItem")}
                    onClick={() => onRemove(kind, sectionIndex, itemIndex)}
                    className="flex w-7 h-7 shrink-0 items-center justify-center rounded-lg text-description hover:text-primary hover:bg-background transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary md:order-5"
                >
                    <X className="w-4 h-4" aria-hidden="true" />
                </button>
            </span>

            <span className="flex items-center justify-center gap-1.5 md:order-3 md:justify-start">
                <input
                    type="time"
                    aria-label={t("Start time")}
                    value={item.startTime}
                    onChange={(e) => onTimeChange(kind, sectionIndex, itemIndex, "startTime", e.target.value)}
                    style={timeInputStyle}
                    className={timeInputClass}
                />
                <span className="text-xs text-description" aria-hidden="true">–</span>
                <input
                    type="time"
                    aria-label={t("End time")}
                    value={item.endTime}
                    onChange={(e) => onTimeChange(kind, sectionIndex, itemIndex, "endTime", e.target.value)}
                    style={timeInputStyle}
                    className={timeInputClass}
                />
            </span>

            <span className="flex items-center justify-between md:order-4 md:gap-1.5">
                <span className="flex items-center gap-1">
                    <button
                        type="button"
                        aria-label={t("AiOnboardingMoveEarlier")}
                        disabled={!canMoveEarlier}
                        onClick={() => onReorder(kind, sectionIndex, itemIndex, -1)}
                        className={arrowClass(canMoveEarlier)}
                    >
                        <ChevronUp className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        aria-label={t("AiOnboardingMoveLater")}
                        disabled={!canMoveLater}
                        onClick={() => onReorder(kind, sectionIndex, itemIndex, 1)}
                        className={arrowClass(canMoveLater)}
                    >
                        <ChevronDown className="w-4 h-4" aria-hidden="true" />
                    </button>
                </span>
                <select
                    aria-label={t("AiOnboardingMoveToSection")}
                    value={sectionIndex}
                    onChange={(e) => onMove(kind, sectionIndex, itemIndex, Number(e.target.value))}
                    style={timeInputStyle}
                    className="max-w-28 shrink-0 truncate rounded-lg border bg-background px-1.5 py-1 text-xs text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                    {sections.map((section, index) => (
                        <option key={`${section.name}-${index}`} value={index}>
                            {section.name}
                        </option>
                    ))}
                </select>
            </span>
        </li>
    );
}
