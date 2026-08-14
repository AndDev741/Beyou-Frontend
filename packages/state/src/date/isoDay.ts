/**
 * `yyyy-MM-dd` arithmetic, done on the string.
 *
 * The check history is keyed by the calendar day in the USER's timezone, which is
 * not necessarily the device's: a check at 21:00 in São Paulo is stored as that
 * São Paulo day, and a client comparing against its own `new Date()` in another
 * zone marks the wrong square as today. Every function here takes the zone
 * explicitly, or takes no clock at all.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Today in `timeZone`, as `yyyy-MM-dd`. Falls back to the device zone when unset or invalid. */
export function todayInZone(timeZone?: string | null, now: Date = new Date()): string {
    const parts = (() => {
        try {
            return new Intl.DateTimeFormat("en-US", {
                timeZone: timeZone || undefined,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }).formatToParts(now);
        } catch {
            // An unknown zone string (a stale profile, a typo) must not take the
            // widget down — the device zone is a wrong-by-a-day answer at worst.
            return new Intl.DateTimeFormat("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }).formatToParts(now);
        }
    })();

    const find = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    return `${find("year")}-${find("month")}-${find("day")}`;
}

/**
 * `iso` shifted by `days`, which may be negative.
 *
 * Anchored at UTC noon so neither end of a DST transition can land on a
 * neighbouring day — the same defence `parseLocalDate` uses.
 */
export function addDaysIso(iso: string, days: number): string {
    const anchor = new Date(`${iso}T12:00:00Z`);
    if (Number.isNaN(anchor.getTime())) return iso;
    anchor.setUTCDate(anchor.getUTCDate() + days);
    return anchor.toISOString().slice(0, 10);
}

/** Weekday of `iso`, Sunday-first (0-6) — the order the app's day pills use (D S T Q Q S S). */
export function weekdayIndexIso(iso: string): number {
    const anchor = new Date(`${iso}T12:00:00Z`);
    if (Number.isNaN(anchor.getTime())) return 0;
    return anchor.getUTCDay();
}

/** Whole days from `from` to `to`, both `yyyy-MM-dd`. Negative when `to` precedes `from`. */
export function daysBetweenIso(from: string, to: string): number {
    const a = new Date(`${from}T12:00:00Z`).getTime();
    const b = new Date(`${to}T12:00:00Z`).getTime();
    if (Number.isNaN(a) || Number.isNaN(b)) return 0;
    return Math.round((b - a) / 86_400_000);
}

/** A day in ms. Exported so a caller can clamp a timer against it. */
export const MS_PER_DAY = 86_400_000;

/**
 * Milliseconds until the next midnight in `timeZone`.
 *
 * A strip anchored on "today" has to learn that the day turned; nothing else tells
 * it. Derived from the wall-clock time in the zone rather than by constructing the
 * next local midnight as an instant: an offset shift makes a local day 23 or 25
 * hours long, and a timer built from the wrong assumption fires on the wrong side of
 * it. Read this way the answer is at worst an hour out on a transition day and
 * self-corrects on the next re-arm, because the caller asks again after it fires.
 *
 * Never returns zero: a timer scheduled for 0ms in a re-arming effect spins.
 */
export function msUntilNextMidnight(timeZone?: string | null, now: Date = new Date()): number {
    const parts = (() => {
        const options: Intl.DateTimeFormatOptions = {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23",
        };
        try {
            return new Intl.DateTimeFormat("en-US", { ...options, timeZone: timeZone || undefined })
                .formatToParts(now);
        } catch {
            return new Intl.DateTimeFormat("en-US", options).formatToParts(now);
        }
    })();

    const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
    const elapsed =
        value("hour") * 3_600_000 + value("minute") * 60_000 + value("second") * 1_000 + now.getMilliseconds();

    const remaining = MS_PER_DAY - elapsed;
    // A second past the turn, so the recomputed day is the new one and not a
    // rounding away from it.
    return Math.min(MS_PER_DAY, Math.max(1_000, remaining + 1_000));
}

/** True for a `yyyy-MM-dd` string. */
export function isIsoDay(value: unknown): value is string {
    return typeof value === "string" && DATE_ONLY.test(value);
}
