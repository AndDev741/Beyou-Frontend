import type { TFunction } from 'i18next';
import {
  CALENDAR_TASK_NOTE_MAX,
  CALENDAR_TASK_TITLE_MAX,
  type CalendarTask,
  type CalendarTaskInput,
} from '@beyou/types/calendar/calendar';
import { isIsoDay } from '@beyou/state';

/** Shortest title the API accepts (`@Size(min = 2)` on the backend's request DTO). */
export const CALENDAR_TASK_TITLE_MIN = 2;

export type CalendarTaskFormValues = {
  title: string;
  /** `yyyy-MM-dd`, or '' before one is picked. */
  date: string;
  /** `HH:mm`, or '' for a task with no time. */
  time: string;
  advanceMinutes: number;
  note: string;
};

export type CalendarTaskFormErrors = Partial<Record<'title' | 'date' | 'note', string>>;

/** What the sheet starts from: the task being edited, or a blank one on `date`. */
export function formValuesOf(task: CalendarTask | null, date?: string): CalendarTaskFormValues {
  if (task) {
    return {
      title: task.title,
      date: task.date,
      time: task.time ?? '',
      advanceMinutes: task.advanceMinutes,
      note: task.note ?? '',
    };
  }
  return { title: '', date: date ?? '', time: '', advanceMinutes: 0, note: '' };
}

/**
 * The same limits the server enforces, checked before the request so the person sees which
 * field is wrong instead of a generic toast. The server stays the authority; this only saves a
 * round trip.
 */
export function validateCalendarTaskForm(values: CalendarTaskFormValues, t: TFunction): CalendarTaskFormErrors {
  const errors: CalendarTaskFormErrors = {};
  const title = values.title.trim();
  if (title.length < CALENDAR_TASK_TITLE_MIN) errors.title = t('CalendarTitleTooShort');
  else if (title.length > CALENDAR_TASK_TITLE_MAX) {
    errors.title = t('YupGenericMaxLength', { max: CALENDAR_TASK_TITLE_MAX });
  }
  if (!isIsoDay(values.date)) errors.date = t('CalendarDateRequired');
  if (values.note.trim().length > CALENDAR_TASK_NOTE_MAX) {
    errors.note = t('YupGenericMaxLength', { max: CALENDAR_TASK_NOTE_MAX });
  }
  return errors;
}

/** The request body. An empty time or note goes out as null, which the server reads as "none". */
export function toCalendarTaskInput(values: CalendarTaskFormValues): CalendarTaskInput {
  const note = values.note.trim();
  return {
    title: values.title.trim(),
    date: values.date,
    time: values.time === '' ? null : values.time,
    advanceMinutes: values.advanceMinutes,
    note: note === '' ? null : note,
  };
}
