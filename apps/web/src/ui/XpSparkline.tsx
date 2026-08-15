import { useState } from "react";
import { useTranslation } from "react-i18next";

export type XpSparklineTone = "good" | "warm" | "accent";
export type XpSparklineSize = "sm" | "md";

const TONE_CLASS: Record<XpSparklineTone, { bar: string; last: string }> = {
    // The redesign's decision, kept in one place: the best area's series is green, the
    // worst one's is flame — attention, not error — and everything else is the accent.
    //
    // 80% against 100%, which is the mockup's own `.bar { opacity: .8 }` and
    // `.bar.hi { opacity: 1 }`. It is meant to be barely there: today reads as the
    // brightest bar in a series of one colour, not as a different colour from the rest
    // of the week. An earlier version used 35% and turned a whole week into "the past,
    // greyed out" — the days before today are not less real than today.
    good: { bar: "bg-success/80", last: "bg-success" },
    warm: { bar: "bg-flame/80", last: "bg-flame" },
    accent: { bar: "bg-accent/80", last: "bg-accent" }
};

const SIZE_CLASS: Record<XpSparklineSize, { plot: string; label: string }> = {
    sm: { plot: "h-9", label: "text-[9px]" },
    md: { plot: "h-14", label: "text-[10px]" }
};

export type XpSparklineProps = {
    /** One value per day, oldest first. The last is today. */
    values: number[];
    /** ISO days matching `values` index for index, for the hover label. */
    days?: string[];
    /** Day labels for the ends of the axis. Only the first and last are drawn. */
    labels?: [string, string];
    tone?: XpSparklineTone;
    size?: XpSparklineSize;
    /** Read out to assistive tech in place of the bars. */
    summary?: string;
};

/**
 * `2026-08-15` as the day it is locally.
 *
 * Built from the parts rather than handed to `new Date(iso)`, which reads a bare date
 * as UTC midnight: west of Greenwich that renders as the day before, so every bar in
 * the tooltip would be labelled with yesterday.
 */
function formatDay(iso: string, locale: string): string {
    const [year, month, day] = iso.split("-").map(Number);
    if (!year || !month || !day) return iso;
    return new Date(year, month - 1, day).toLocaleDateString(locale, {
        weekday: "short",
        day: "2-digit"
    });
}

/**
 * A week of XP as bars, with today the brightest.
 *
 * <p>The chart the redesign asked for and the API could not answer. `betterArea` said
 * so in a comment for months: the mockup puts weekly bars here, the API returns only a
 * running total, so the widget shipped with a level bar instead of inventing a series.
 * `GET /xp/history` answers it now, for every entity that carries XP.
 *
 * <p>Laid out with elements rather than the mockup's SVG, and that is not a stylistic
 * choice. An SVG with a fixed viewBox scales EVERYTHING by the width it is given: in a
 * 300px widget the mockup's 140-wide drawing is already at 2×, and on a category card
 * twice that, where the 7px axis labels came out bigger than the card's own title.
 * Elements do not scale — the bars stretch, the type stays type, and the chart is the
 * same size in a narrow rail and a wide card.
 *
 * <p>Scaled to its own maximum rather than to a fixed ceiling, because the question
 * these bars answer is "which day was the good one", not "how does this compare to some
 * absolute". A category earning 5 XP a day and one earning 500 both get a readable
 * shape.
 *
 * <p>A day with nothing gets a visible sliver rather than no bar at all. Zero is a real
 * answer — it says nothing happened — and an empty slot reads as missing data, which is
 * the confusion the streak strip's legend exists to prevent.
 *
 * <p>Each bar is a button so its number can be reached three ways rather than one.
 * Hover is the desktop answer and CSS alone; a phone has no hover, so a tap holds the
 * label open; and a button is focusable, so the same number arrives by keyboard and is
 * announced by a screen reader — which a hover-only tooltip never is.
 */
export default function XpSparkline({
    values,
    days,
    labels,
    tone = "accent",
    size = "md",
    summary
}: XpSparklineProps) {
    const { t, i18n } = useTranslation();
    // Which bar a tap is holding open. Hover needs no state; touch has no hover.
    const [pinned, setPinned] = useState<number | null>(null);

    if (values.length === 0) return null;

    const classes = TONE_CLASS[tone];
    const sizes = SIZE_CLASS[size];
    // Negative days (XP given back) do not draw below the floor: the axis is "how much
    // that day", and a day that ended at less than nothing is still a day with nothing.
    const peak = Math.max(...values.map((value) => Math.max(value, 0)), 0);

    return (
        <div
            className="mt-3"
            role="img"
            aria-label={summary ?? t("XpLastDays", { count: values.length })}
        >
            <div className={`relative flex items-end gap-[3px] ${sizes.plot}`}>
                {/* The mockup's three grid lines, behind the bars. */}
                {[0, 50, 100].map((offset) => (
                    <span
                        key={offset}
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 border-t border-border"
                        style={{ top: `${offset}%` }}
                    />
                ))}

                {values.map((value, index) => {
                    // Percent of the tallest day, with a floor so a day that earned
                    // nothing is still visible as a day.
                    const height = peak > 0 ? Math.max(6, (Math.max(value, 0) / peak) * 100) : 6;
                    const isToday = index === values.length - 1;
                    const isFirst = index === 0;
                    const dayLabel = days?.[index] ? formatDay(days[index], i18n.language) : null;
                    const label = `${dayLabel ? `${dayLabel} · ` : ""}${Math.round(value)} XP`;
                    const isPinned = pinned === index;
                    return (
                        <button
                            key={index}
                            type="button"
                            data-testid="xp-bar"
                            aria-label={label}
                            onClick={() => setPinned(isPinned ? null : index)}
                            className={`group/bar relative flex-1 rounded-[2px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                                isToday ? classes.last : classes.bar
                            }`}
                            style={{ height: `${height}%` }}
                        >
                            {/* Hover is CSS with no state behind it: seven bars do not
                                need a positioning library, and re-rendering per pointer
                                move to show one number is a bad trade. A tap pins it
                                instead, because a phone never hovers.

                                The two ends anchor to their own edge rather than
                                centring, or their labels hang off the card. */}
                            <span
                                aria-hidden="true"
                                className={`pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-control border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] leading-tight text-text shadow-sm transition-opacity duration-150 ${
                                    isPinned
                                        ? "opacity-100"
                                        : "opacity-0 group-hover/bar:opacity-100"
                                } ${
                                    isFirst
                                        ? "left-0"
                                        : isToday
                                          ? "right-0"
                                          : "left-1/2 -translate-x-1/2"
                                }`}
                            >
                                {label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {labels && (
                <div
                    aria-hidden="true"
                    className={`mt-1 flex justify-between font-mono text-text-3 ${sizes.label}`}
                >
                    <span>{labels[0]}</span>
                    <span>{labels[1]}</span>
                </div>
            )}
        </div>
    );
}
