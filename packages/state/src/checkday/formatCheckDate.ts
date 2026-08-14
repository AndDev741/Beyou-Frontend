/**
 * The "since 12 Jun" line under a check-in total.
 *
 * Day and month only while the date is inside the current year; a first check-in
 * from an earlier year gets the year too, because "since 12 Jun" on a two-year-old
 * habit reads as this June.
 */
export function formatFirstCheckIn(iso: string, locale: string, todayIso: string): string {
    const date = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(date.getTime())) return iso;

    const sameYear = iso.slice(0, 4) === todayIso.slice(0, 4);
    return new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        ...(sameYear ? {} : { year: "numeric" }),
    }).format(date);
}
