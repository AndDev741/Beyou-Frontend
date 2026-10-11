import { z } from "zod";
import type { TFunction } from "i18next";
import { isIsoDay } from "@beyou/state";
import { CALENDAR_TASK_NOTE_MAX, CALENDAR_TASK_TITLE_MAX } from "@beyou/types/calendar/calendar";

/** `HH:mm`, 00:00 to 23:59. What `<input type="time">` produces and what the API reads. */
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export type CalendarTaskFormValues = {
    title: string;
    date: string;
    /** Empty for a task with no time. */
    time: string;
    advanceMinutes: number;
    note: string;
};

/**
 * The create/edit form's rules, mirroring `CalendarTaskRequestDTO`: a title of 2 to 255
 * characters and a date are required; the time is optional; the note stops at 1000.
 *
 * Kept next to the web dialog for now. When the mobile form wants the same rules this belongs in
 * `@beyou/validation` beside `taskSchemas`.
 */
export const calendarTaskSchema = (t: TFunction) =>
    z.object({
        title: z
            .string()
            .trim()
            .min(2, t("CalendarTitleTooShort"))
            .max(CALENDAR_TASK_TITLE_MAX, t("YupMaxName", { max: CALENDAR_TASK_TITLE_MAX })),
        date: z.string().refine((value) => isIsoDay(value), t("CalendarDateRequired")),
        time: z.string().refine((value) => value === "" || TIME.test(value), t("CalendarTimeInvalid")),
        advanceMinutes: z.number().int().min(0).max(10080),
        note: z
            .string()
            .max(CALENDAR_TASK_NOTE_MAX, t("YupDescriptionMaxValue", { max: CALENDAR_TASK_NOTE_MAX })),
    });
