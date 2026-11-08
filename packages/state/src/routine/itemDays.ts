/**
 * A routine item's own weekdays, shared by web and mobile.
 *
 * An item (a habit or task inside a section, or a list entry) can be limited to some of the
 * days its routine runs. It runs on a date when the routine's schedule covers that weekday AND
 * its `days` are empty or include it. Empty is the default and means "every day the routine
 * runs", exactly as before the field existed.
 *
 * The dashboard never needs this: `GET /routine/today` is filtered on the server. These are
 * for the screens that show the WHOLE routine (the routines page, the editors).
 */
import type { WeekDay } from '@beyou/types/schedule/weekDay';
import { todayInZone, weekdayIndexIso } from '../date/isoDay';

/** Monday first, the order the backend writes and the chip reads in. */
export const WEEK_DAYS: readonly WeekDay[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/** Sunday first, the order the app's rows of day squares use (D S T Q Q S S). */
export const WEEK_DAYS_SUNDAY_FIRST: readonly WeekDay[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** The existing i18n short-day keys, one per day. */
export const SHORT_DAY_KEY: Readonly<Record<WeekDay, string>> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
};

const BY_LOWER = new Map(WEEK_DAYS.map((day) => [day.toLowerCase(), day]));

/** "saturday" or "SATURDAY" to "Saturday"; anything else to undefined. Schedules have been written in more than one case. */
export const toWeekDay = (value: string | null | undefined): WeekDay | undefined =>
  value ? BY_LOWER.get(value.trim().toLowerCase()) : undefined;

/**
 * The weekday of a `yyyy-MM-dd` calendar day.
 *
 * Takes the date string, not a Date, on purpose: a `yyyy-MM-dd` has exactly one weekday, while
 * an instant has one per timezone. Build the string with `todayInZone`, never with
 * `new Date().toJSON().slice(0, 10)`, which is the UTC day and turns into tomorrow at 21:00
 * in Brazil.
 */
export function weekDayOfIso(iso: string): WeekDay {
  return WEEK_DAYS_SUNDAY_FIRST[weekdayIndexIso(iso)];
}

/** Today's weekday in the user's zone (the profile's `timezone`), falling back to the device's. */
export function todayWeekDay(timeZone?: string | null, now: Date = new Date()): WeekDay {
  return weekDayOfIso(todayInZone(timeZone, now));
}

/** Known days only, without repeats, in week order. Does NOT collapse seven to none; see `followsRoutine`. */
export function normalizeItemDays(days: readonly string[] | null | undefined): WeekDay[] {
  const set = new Set((days ?? []).map(toWeekDay).filter((day): day is WeekDay => Boolean(day)));
  return WEEK_DAYS.filter((day) => set.has(day));
}

/** True when the days put no limit on the item: none at all, or all seven (the server stores those as none). */
export function followsRoutine(days: readonly string[] | null | undefined): boolean {
  const normalized = normalizeItemDays(days);
  return normalized.length === 0 || normalized.length === WEEK_DAYS.length;
}

/** Whether an item with these `days` runs on the `yyyy-MM-dd` date (as far as its own days go). */
export function isItemActiveOn(days: readonly string[] | null | undefined, iso: string): boolean {
  if (followsRoutine(days)) return true;
  return normalizeItemDays(days).includes(weekDayOfIso(iso));
}

/** The picker's toggle: adds the day or takes it out, and keeps week order. */
export function toggleItemDay(days: readonly string[] | null | undefined, day: WeekDay): WeekDay[] {
  const current = normalizeItemDays(days);
  return current.includes(day) ? current.filter((d) => d !== day) : normalizeItemDays([...current, day]);
}

/**
 * The chip on an item: "Sat", "Sat · Sun". Empty when the item follows the routine, so a
 * caller can render the chip only when there is something to say.
 */
export function formatItemDays(days: readonly string[] | null | undefined, t: (key: string) => string): string {
  if (followsRoutine(days)) return '';
  return normalizeItemDays(days)
    .map((day) => t(SHORT_DAY_KEY[day]))
    .join(' · ');
}

/**
 * True when the item is limited to days the routine never runs on, so it would never show up.
 *
 * False while there is nothing to compare against: an item that follows the routine, or a
 * routine with no schedule yet (one being created has none).
 */
export function itemDaysMissSchedule(
  itemDays: readonly string[] | null | undefined,
  scheduleDays: readonly string[] | null | undefined,
): boolean {
  if (followsRoutine(itemDays)) return false;
  const schedule = normalizeItemDays(scheduleDays);
  if (schedule.length === 0) return false;
  return !normalizeItemDays(itemDays).some((day) => schedule.includes(day));
}
