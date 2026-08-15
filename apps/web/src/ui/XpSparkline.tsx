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
    /** Day labels for the ends of the axis. Only the first and last are drawn. */
    labels?: [string, string];
    tone?: XpSparklineTone;
    size?: XpSparklineSize;
    /** Read out to assistive tech in place of the bars. */
    summary?: string;
};

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
 */
export default function XpSparkline({
    values,
    labels,
    tone = "accent",
    size = "md",
    summary
}: XpSparklineProps) {
    const { t } = useTranslation();

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
                    return (
                        <span
                            key={index}
                            data-testid="xp-bar"
                            className={`relative flex-1 rounded-[2px] ${
                                isToday ? classes.last : classes.bar
                            }`}
                            style={{ height: `${height}%` }}
                        />
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
