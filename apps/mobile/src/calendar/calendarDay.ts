import { MOOD_LEVELS } from '@beyou/state';
import type { MoodLevel } from '@beyou/types/mood/mood';
import type { CalendarDay } from '@beyou/types/calendar/calendar';
import type { ApiErrorPayload } from '@beyou/api/apiError';

/** Local noon of `iso`, which formats as that same day in any device timezone. */
export const noonOf = (iso: string) => new Date(`${iso}T12:00:00`);

/** The day's mood as one of the five levels the faces know, or null. */
export function moodLevelOf(day: CalendarDay): MoodLevel | null {
  const level = day.mood?.level;
  return (MOOD_LEVELS as readonly number[]).includes(level ?? -1) ? (level as MoodLevel) : null;
}

/** How a day's routine went, for its marker: done beats recorded beats planned. */
export function routineStateOf(day: CalendarDay): 'done' | 'recorded' | 'planned' | null {
  if (day.routines.length === 0) return null;
  if (day.routines.some((routine) => routine.completed)) return 'done';
  if (day.routines.some((routine) => routine.source === 'SNAPSHOT')) return 'recorded';
  return 'planned';
}

/** Whether a day holds anything at all to list. */
export function isDayEmpty(day: CalendarDay): boolean {
  return day.tasks.length === 0 && day.routines.length === 0 && day.goals.length === 0 && !day.mood;
}

/**
 * The server no longer has the task: deleted on another device, or with the account's data
 * reset. Every task route answers this 404 for a task the caller cannot see, so the screens
 * treat it as "gone" (drop it, close what was open on it) rather than as a failure to retry.
 */
export function isCalendarTaskGone(error?: ApiErrorPayload): boolean {
  return error?.errorKey === 'CALENDAR_TASK_NOT_FOUND';
}
