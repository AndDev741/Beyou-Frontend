/**
 * Parses a value the backend sends as a `LocalDate` (`yyyy-MM-dd`) into a Date
 * in the LOCAL timezone.
 *
 * `new Date("2026-08-21")` is parsed as UTC midnight by spec. West of UTC that
 * is the 20th at 21:00 local, so every deadline rendered a day early for the
 * whole of Brazil — and a goal due on Monday fell into the `past` bucket, which
 * no dashboard horizon renders, so it vanished in the very week it was due.
 *
 * Anchoring at NOON is the usual defence: it survives both directions of DST
 * and any offset from -11 to +13 without landing on a neighbouring day. The
 * same idiom already lived in `DateField.ymdToDate` and in the routines
 * overview; this is the shared home for it.
 *
 * Values that already carry a time (`...T10:00:00`, ISO with offset) are left
 * to the platform parser — those are unambiguous.
 */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function parseLocalDate(value: Date | string | undefined | null): Date | null {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

    const parsed = DATE_ONLY.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}
