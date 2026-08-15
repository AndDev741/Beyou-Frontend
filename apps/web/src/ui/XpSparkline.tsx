import { useTranslation } from "react-i18next";

export type XpSparklineTone = "good" | "warm" | "accent";

const TONE_CLASS: Record<XpSparklineTone, { bar: string; last: string }> = {
    // The redesign's decision, kept in one place: the best area's series is green, the
    // worst one's is flame — attention, not error — and everything else is the accent.
    good: { bar: "fill-success/35", last: "fill-success" },
    warm: { bar: "fill-flame/35", last: "fill-flame" },
    accent: { bar: "fill-accent/35", last: "fill-accent" }
};

/** Viewbox, from the mockup. Bars are laid out inside it and scaled by the container. */
const WIDTH = 140;
const HEIGHT = 56;
const FLOOR = 46;
const CEILING = 8;
const GRID_LINES = [14, 30, 46];

export type XpSparklineProps = {
    /** One value per day, oldest first. The last is today. */
    values: number[];
    /** Day labels for the ends of the axis. Only the first and last are drawn. */
    labels?: [string, string];
    tone?: XpSparklineTone;
    /** Read out to assistive tech in place of the bars. */
    summary?: string;
};

/**
 * A week of XP as bars, with today highlighted.
 *
 * <p>The chart the redesign asked for and the API could not answer. `betterArea` said
 * so in a comment for months: the mockup puts weekly bars here, the API returns only a
 * running total, so the widget shipped with a level bar instead of inventing a series.
 * `GET /xp/history` answers it now, for every entity that carries XP.
 *
 * Scaled to its own maximum rather than to a fixed ceiling, because the question these
 * bars answer is "which day was the good one", not "how does this compare to some
 * absolute". A category earning 5 XP a day and one earning 500 both deserve a readable
 * shape.
 *
 * A day with nothing gets a visible sliver rather than no bar at all. Zero is a real
 * answer — it says nothing happened — and an empty slot reads as missing data, which is
 * the confusion the streak strip's legend exists to prevent.
 */
export default function XpSparkline({
    values,
    labels,
    tone = "accent",
    summary
}: XpSparklineProps) {
    const { t } = useTranslation();
    const classes = TONE_CLASS[tone];

    if (values.length === 0) return null;

    const slot = WIDTH / values.length;
    const barWidth = Math.min(11, Math.max(3, slot * 0.62));
    const span = FLOOR - CEILING;
    // Negative days (XP given back) do not draw below the floor: the axis is "how much
    // that day", and a day that ended at less than nothing is still a day with nothing.
    const peak = Math.max(...values.map((value) => Math.max(value, 0)), 0);

    return (
        <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="mt-3 w-full"
            role="img"
            aria-label={summary ?? t("XpLastDays", { count: values.length })}
        >
            {GRID_LINES.map((y) => (
                <line
                    key={y}
                    x1={0}
                    y1={y}
                    x2={WIDTH}
                    y2={y}
                    className="stroke-border"
                    strokeWidth={1}
                />
            ))}

            {values.map((value, index) => {
                const height = peak > 0 ? Math.max(2, (Math.max(value, 0) / peak) * span) : 2;
                const isToday = index === values.length - 1;
                return (
                    <rect
                        key={index}
                        x={index * slot + (slot - barWidth) / 2}
                        y={FLOOR - height}
                        width={barWidth}
                        height={height}
                        rx={2.5}
                        className={isToday ? classes.last : classes.bar}
                    />
                );
            })}

            {labels && (
                <>
                    <text x={2} y={HEIGHT - 1} className="fill-text-3 font-mono text-[7px]">
                        {labels[0]}
                    </text>
                    <text
                        x={WIDTH - 2}
                        y={HEIGHT - 1}
                        textAnchor="end"
                        className="fill-text-3 font-mono text-[7px]"
                    >
                        {labels[1]}
                    </text>
                </>
            )}
        </svg>
    );
}
