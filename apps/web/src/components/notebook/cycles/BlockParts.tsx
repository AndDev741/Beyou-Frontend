import { useTranslation } from "react-i18next";
import { Check, Clock, Redo2, Target } from "lucide-react";
import type { BlockFigure } from "@beyou/state";
import type { BlockMode, LapBlockState } from "@beyou/types/notebook/studyCycle";

/** The figure's tone in theme tokens: the label's colour, the bar and its track. */
const TONE: Record<BlockFigure["tone"], { label: string; bar: string; track: string }> = {
    done: { label: "text-success", bar: "bg-success", track: "bg-surface-2" },
    active: { label: "text-text", bar: "bg-accent", track: "bg-accent/15" },
    idle: { label: "text-text", bar: "bg-accent", track: "bg-surface-2" },
    muted: { label: "text-text-2", bar: "bg-text-3", track: "bg-surface-2" },
};

/**
 * The right column of a block: what it is after and how far along, with the time it took
 * second for a concept. The wording comes from `blockFigure` in @beyou/state, shared with the
 * phone.
 */
export function BlockFigureView({ figure, className = "" }: { figure: BlockFigure; className?: string }) {
    const { t } = useTranslation();
    const tone = TONE[figure.tone];
    return (
        <div className={`flex flex-col gap-1.5 ${className}`} data-testid="block-figure">
            <span className={`text-[13px] font-semibold ${tone.label}`}>{t(figure.label.key, figure.label.values)}</span>
            <div className={`h-[5px] overflow-hidden rounded-full ${tone.track}`} aria-hidden="true">
                <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.round(figure.share * 100)}%` }} />
            </div>
            {figure.caption && <span className="text-xs text-text-2">{t(figure.caption.key, figure.caption.values)}</span>}
        </div>
    );
}

/**
 * The tile on the left of a block: a check once it is done, a target for a concept, a clock for
 * time. The block the day is on gets the filled tile.
 */
export function BlockIcon({ done, concept, current }: { done: boolean; concept: boolean; current?: boolean }) {
    const tile = done
        ? "bg-success/15 text-success"
        : current
          ? "bg-accent text-on-accent"
          : concept
            ? "bg-accent-soft text-accent"
            : "bg-surface-2 text-text-2";
    const Icon = done ? Check : concept ? Target : Clock;
    return (
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-control ${tile}`} aria-hidden="true">
            <Icon size={18} strokeWidth={done ? 2.25 : 2} />
        </span>
    );
}

/** The marker on the cycle screen: the block's number while open, how it closed once closed. */
export function BlockMarker({ position, state, current }: { position: number; state: LapBlockState; current: boolean }) {
    if (state === "DONE" || state === "UNDERSTOOD") {
        return (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-success/15 text-success" aria-hidden="true">
                <Check size={16} strokeWidth={2.25} />
            </span>
        );
    }
    if (state === "TURN_USED") {
        return (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-surface-2 text-text-2" aria-hidden="true">
                <Redo2 size={16} />
            </span>
        );
    }
    return (
        <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-control font-mono text-[13px] font-semibold ${
                current ? "bg-accent text-on-accent" : "bg-surface-2 text-text-2"
            }`}
            aria-hidden="true"
        >
            {position}
        </span>
    );
}

/**
 * The root topic, small and muted, in front of a subject that is a page inside a topic:
 * "Software Engineer ›" before "Implementação 2.0". Nothing for a root subject, or when an older
 * server sends no root.
 */
export function RootPrefix({ root, className = "" }: { root: string | null | undefined; className?: string }) {
    if (!root) return null;
    return <span className={`font-normal text-text-2 ${className}`} data-testid="subject-root">{root} › </span>;
}

/** "Goal" or "Time", the block's kind at a glance. */
export function ModeChip({ mode }: { mode: BlockMode }) {
    const { t } = useTranslation();
    return (
        <span
            className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold ${
                mode === "GOAL" ? "bg-accent-soft text-accent" : "bg-surface-2 text-text-2"
            }`}
        >
            {t(mode === "GOAL" ? "StudyCycleModeGoal" : "StudyCycleModeTime")}
        </span>
    );
}

/**
 * A topic's colour in the history's bars and legend, by its place in the cycle. Theme tokens
 * only: the five tones the theme has, then the same five lighter. Flame and xp are both warm, so
 * they sit apart in the order and two neighbouring topics never get them both.
 */
const TOPIC_TONES = [
    "bg-accent",
    "bg-success",
    "bg-flame",
    "bg-text-3",
    "bg-xp",
    "bg-accent/50",
    "bg-success/50",
    "bg-flame/50",
    "bg-text-3/50",
    "bg-xp/50",
];

export const topicTone = (index: number): string => TOPIC_TONES[((index % TOPIC_TONES.length) + TOPIC_TONES.length) % TOPIC_TONES.length];
