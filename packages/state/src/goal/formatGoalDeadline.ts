/**
 * A goal's deadline in the short form the card uses — with the YEAR in front
 * when it is not the current one.
 *
 * Without the year, "by Jul 24" on a 2027 goal reads as this July: weeks away
 * instead of years. It only shows when it differs, because repeating the
 * current year on every goal is noise.
 *
 * Lives in the shared package because web and mobile show the same deadline in
 * the same two places (the dashboard block and the goals page card), and two
 * copies would drift on the first change.
 */
import { parseLocalDate } from '../date/parseLocalDate';

export type DeadlineShape =
    /** Weekday only: "Sat". For goals due this week. */
    | 'weekday'
    /** Day and month: "Jul 24". */
    | 'dayMonth'
    /** Month only: "Jul". For long horizons. */
    | 'month';

const FORMATS: Record<DeadlineShape, Intl.DateTimeFormatOptions> = {
    weekday: { weekday: 'short' },
    dayMonth: { day: 'numeric', month: 'short' },
    month: { month: 'short' },
};

export function formatGoalDeadline(
    value: Date | string | undefined | null,
    locale: string,
    shape: DeadlineShape = 'dayMonth',
    /** Injectable for tests; defaults to now. */
    now: Date = new Date(),
): string {
    // Date-only strings must be read in the local timezone — see parseLocalDate.
    const end = parseLocalDate(value);
    if (!end) return '';

    const label = new Intl.DateTimeFormat(locale, FORMATS[shape]).format(end);
    const year = end.getFullYear();
    return year === now.getFullYear() ? label : `${label} - ${year}`;
}
