import { CALENDAR_ADVANCE_PRESETS } from "@beyou/types/calendar/calendar";
import { advanceLabelKey, type MonthCursor } from "@beyou/state";
import type { TFunction } from "i18next";

/**
 * Labels for the calendar, built so the browser's own timezone can never move a day.
 *
 * Every `yyyy-MM-dd` is turned into a LOCAL date at noon before it is formatted. Formatting
 * `Date.UTC(y, m, 1)` instead looks right in Lisbon and wrong in São Paulo: midnight UTC on the
 * first is still the previous evening at UTC-3, so the month name and every weekday head come
 * out one step behind.
 */
export function localNoon(iso: string): Date {
    return new Date(`${iso}T12:00:00`);
}

/** "Sunday, 11 October 2026" in the app's language. */
export function longDateLabel(language: string, iso: string): string {
    return new Intl.DateTimeFormat(language, { dateStyle: "full" }).format(localNoon(iso));
}

/** "11 Oct". */
export function shortDateLabel(language: string, iso: string): string {
    return new Intl.DateTimeFormat(language, { day: "numeric", month: "short" }).format(localNoon(iso));
}

/** "October 2026". */
export function monthLabel(language: string, cursor: MonthCursor): string {
    return new Intl.DateTimeFormat(language, { month: "long", year: "numeric" }).format(
        new Date(cursor.year, cursor.monthIndex, 15, 12),
    );
}

/** "11 Oct – 17 Oct 2026" for the seven days of a week. */
export function weekLabel(language: string, days: string[]): string {
    const first = days[0];
    const last = days[days.length - 1];
    const year = new Intl.DateTimeFormat(language, { year: "numeric" }).format(localNoon(last));
    return `${shortDateLabel(language, first)} – ${shortDateLabel(language, last)} ${year}`;
}

/** Weekday names Sunday to Saturday, for column heads. */
export function weekdayHeads(language: string, style: "narrow" | "short"): string[] {
    const format = new Intl.DateTimeFormat(language, { weekday: style });
    // 1 February 2026 is a Sunday; local noon keeps it one.
    return Array.from({ length: 7 }, (_, index) => format.format(new Date(2026, 1, 1 + index, 12)));
}

/** The weekday of one day, short ("Sun"). */
export function weekdayShort(language: string, iso: string): string {
    return new Intl.DateTimeFormat(language, { weekday: "short" }).format(localNoon(iso));
}

const PRESETS: readonly number[] = CALENDAR_ADVANCE_PRESETS;

/**
 * The label for an advance notice. The forms only offer the presets, which all have a key; the
 * API accepts any minute count up to a week, so anything else falls back to plain minutes rather
 * than showing a raw key.
 */
export function advanceLabel(t: TFunction, minutes: number): string {
    return PRESETS.includes(minutes) ? t(advanceLabelKey(minutes)) : `${minutes} min`;
}
