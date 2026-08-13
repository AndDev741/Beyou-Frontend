import { useTranslation } from "react-i18next";
import { checkDayLabelKey, checkDayTone, countDone, type CheckTone } from "@beyou/state";
import type { CheckDay } from "@beyou/types/checkday/checkHistory";

/**
 * One square per day: the strip under the streak widget and under a habit card.
 *
 * Four tones, not six: the three ways a day can be a non-event (not scheduled, in
 * no routine, no record) look the same, because the reader cannot decode three
 * greys — and each says which one it is on hover. Today before it is checked gets
 * a ring instead of a grey, since its outcome has not been decided yet.
 */
const TONE_CLASS: Record<CheckTone, string> = {
    done: "bg-accent",
    skipped: "bg-accent/45",
    missed: "bg-danger/35",
    idle: "bg-surface-2",
    open: "bg-surface-2 ring-1 ring-inset ring-accent/70",
};

type CheckCellProps = {
    day: CheckDay | null;
    today?: string;
    /** Locale-formatted date for the tooltip. */
    dateLabel?: string;
    outcomeLabel?: string;
};

/** A single square. `null` is a spacer that pads a week-aligned grid. */
export function CheckCell({ day, today, dateLabel, outcomeLabel }: CheckCellProps) {
    if (!day) return <i className="aspect-square rounded-[3px] bg-transparent" aria-hidden="true" />;
    const tone = checkDayTone(day, today);
    return (
        <i
            className={`aspect-square rounded-[3px] ${TONE_CLASS[tone]}`}
            title={dateLabel ? `${dateLabel} · ${outcomeLabel}` : outcomeLabel}
            data-outcome={day.outcome}
            data-day={day.day}
        />
    );
}

type CheckStripProps = {
    days: CheckDay[];
    /** Today in the USER's timezone, so the open square is the right one. */
    today?: string;
    /** Columns; the days flow left to right, oldest first. */
    columns?: 7 | 14;
    className?: string;
    testId?: string;
};

/**
 * The strip itself. It is one `role="img"` with a summary label rather than 28
 * focusable squares — a screen reader walking "square, square, square" tells the
 * user nothing, and the number of done days is the whole message.
 */
export default function CheckStrip({
    days,
    today,
    columns = 14,
    className = "",
    testId,
}: CheckStripProps) {
    const { t, i18n } = useTranslation();
    const formatDay = new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" });

    return (
        <div
            className={`grid gap-[3px] ${columns === 7 ? "grid-cols-7" : "grid-cols-14"} ${className}`}
            role="img"
            aria-label={t("CheckStripLabel", { done: countDone(days), total: days.length })}
            data-testid={testId}
        >
            {days.map((day) => (
                <CheckCell
                    key={day.day}
                    day={day}
                    today={today}
                    dateLabel={formatDay.format(new Date(`${day.day}T12:00:00`))}
                    outcomeLabel={t(checkDayLabelKey(day, today))}
                />
            ))}
        </div>
    );
}

/**
 * What the four tones mean, for the one place with room to say it.
 *
 * The small strip does without: hovering a square already names its day, and four
 * labelled swatches under a 28-square strip is more legend than data.
 */
export function CheckLegend({ className = "" }: { className?: string }) {
    const { t } = useTranslation();
    const entries: Array<{ tone: CheckTone; labelKey: string }> = [
        { tone: "done", labelKey: "OutcomeDone" },
        { tone: "skipped", labelKey: "OutcomeSkipped" },
        { tone: "missed", labelKey: "OutcomeMissed" },
        { tone: "idle", labelKey: "OutcomeNoActivity" },
    ];

    return (
        <ul className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
            {entries.map(({ tone, labelKey }) => (
                <li key={tone} className="flex items-center gap-1 text-[10.5px] text-text-3">
                    <i className={`h-2.5 w-2.5 rounded-[3px] ${TONE_CLASS[tone]}`} aria-hidden="true" />
                    {t(labelKey)}
                </li>
            ))}
        </ul>
    );
}

/** The strip's shape while the history is in flight, so the card does not jump. */
export function CheckStripSkeleton({ length = 14, columns = 14 }: { length?: number; columns?: 7 | 14 }) {
    return (
        <div
            className={`grid gap-[3px] ${columns === 7 ? "grid-cols-7" : "grid-cols-14"}`}
            aria-hidden="true"
        >
            {Array.from({ length }, (_, index) => (
                <i key={index} className="aspect-square animate-pulse rounded-[3px] bg-surface-2" />
            ))}
        </div>
    );
}
