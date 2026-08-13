/**
 * Turning a check history into something drawable — the part that is identical on
 * web and mobile, so neither platform invents its own reading of an outcome.
 *
 * No React, no DOM, no colour values: a tone is a name, and each platform maps it
 * to a token.
 */
import type { CheckDay, CheckDayOutcome } from "@beyou/types/checkday/checkHistory";
import { addDaysIso, weekdayIndexIso } from "../date/isoDay";

/**
 * What a square looks like, in five buckets rather than six outcomes.
 *
 * `idle` collapses the three neutral outcomes on purpose: not-scheduled, not-in-a-
 * routine and no-record are three different EXPLANATIONS of the same non-event, and
 * a strip that painted them three shades of grey would be asking the reader to
 * decode noise. They stay distinct in the tooltip, which is where the difference
 * is useful.
 *
 * `open` is today before it has been checked. A day's outcome is only decided when
 * it closes, so the last square reads UNKNOWN all day — drawing it as the same grey
 * as a day with no record would tell the user they had already failed at 9am.
 */
export type CheckTone = "done" | "skipped" | "missed" | "idle" | "open";

/** i18n keys for the tooltip. The three neutral outcomes each say why. */
export const OUTCOME_LABEL_KEY: Record<CheckDayOutcome, string> = {
    DONE: "OutcomeDone",
    SKIPPED: "OutcomeSkipped",
    MISSED: "OutcomeMissed",
    NOT_SCHEDULED: "OutcomeNotScheduled",
    NOT_IN_ROUTINE: "OutcomeNotInRoutine",
    UNKNOWN: "OutcomeUnknown",
};

/** Today's own label, which is not "no record" but "not decided yet". */
export const TODAY_OPEN_LABEL_KEY = "OutcomeTodayOpen";

const TONE_BY_OUTCOME: Record<CheckDayOutcome, CheckTone> = {
    DONE: "done",
    SKIPPED: "skipped",
    MISSED: "missed",
    NOT_SCHEDULED: "idle",
    NOT_IN_ROUTINE: "idle",
    UNKNOWN: "idle",
};

export function checkDayTone(day: CheckDay, todayIso?: string): CheckTone {
    if (todayIso && day.day === todayIso && day.outcome === "UNKNOWN") return "open";
    return TONE_BY_OUTCOME[day.outcome] ?? "idle";
}

export function checkDayLabelKey(day: CheckDay, todayIso?: string): string {
    if (todayIso && day.day === todayIso && day.outcome === "UNKNOWN") return TODAY_OPEN_LABEL_KEY;
    return OUTCOME_LABEL_KEY[day.outcome] ?? OUTCOME_LABEL_KEY.UNKNOWN;
}

/** The range for a strip of `length` days ending today, both ends inclusive. */
export function stripRange(length: number, todayIso: string): { from: string; to: string } {
    return { from: addDaysIso(todayIso, -(length - 1)), to: todayIso };
}

/**
 * The range for a `weeks`-column heatmap ending on today's week.
 *
 * Starts on a Sunday so every row of the grid is one weekday, the way the app's
 * day pills already read (D S T Q Q S S). The last column is the current week and
 * is therefore short — that is the shape, not a gap.
 */
export function heatmapRange(weeks: number, todayIso: string): { from: string; to: string } {
    const startOfThisWeek = addDaysIso(todayIso, -weekdayIndexIso(todayIso));
    return { from: addDaysIso(startOfThisWeek, -(weeks - 1) * 7), to: todayIso };
}

/**
 * Days padded with leading blanks so the first entry falls on its own weekday row.
 *
 * Read column-first by a 7-row grid: cell 0 is the first column's Sunday. Nothing
 * pads the tail — an unfinished current week should look unfinished.
 */
export function weekAlignedCells(days: CheckDay[]): (CheckDay | null)[] {
    if (days.length === 0) return [];
    const leading = weekdayIndexIso(days[0].day);
    return [...Array.from({ length: leading }, () => null), ...days];
}

/** The last `length` entries — the recent end is the one worth showing. */
export function takeLastDays(days: CheckDay[], length: number): CheckDay[] {
    return days.length <= length ? days : days.slice(days.length - length);
}

/** How many days in the range were closed as done. Feeds the strip's accessible label. */
export function countDone(days: CheckDay[]): number {
    return days.reduce((total, day) => (day.outcome === "DONE" ? total + 1 : total), 0);
}
