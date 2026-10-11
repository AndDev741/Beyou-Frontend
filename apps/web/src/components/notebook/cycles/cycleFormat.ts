import { WEEKDAYS } from "@beyou/state";
import type { Weekday } from "@beyou/types/notebook/studyCycle";

/**
 * Day names Monday first, in the reader's language, from a known Monday. Formatted in UTC at
 * noon so no zone can push a name onto its neighbour.
 */
export function weekdayNames(language: string, style: "narrow" | "short" | "long" = "short"): Record<Weekday, string> {
    const format = new Intl.DateTimeFormat(language, { weekday: style, timeZone: "UTC" });
    // 2026-10-12 is a Monday.
    return Object.fromEntries(
        WEEKDAYS.map((weekday, index) => [weekday, format.format(new Date(Date.UTC(2026, 9, 12 + index, 12)))])
    ) as Record<Weekday, string>;
}

/** A "YYYY-MM-DD" day as a Date at local noon, so formatting never lands on the day before. */
export const noonOf = (iso: string): Date => new Date(`${iso}T12:00:00`);

/**
 * The first letter up, the rest as the locale wrote it. CSS `capitalize` raises every word, which
 * turns "segunda-feira, 5 de outubro" into "Segunda-Feira, 5 De Outubro".
 */
export const sentenceCase = (text: string): string => (text ? text.charAt(0).toLocaleUpperCase() + text.slice(1) : text);
