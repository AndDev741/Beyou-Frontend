import { useId } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import { createCalendarTask, editCalendarTask } from "@beyou/api/calendar/calendarApi";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import {
    CALENDAR_ADVANCE_PRESETS,
    CALENDAR_TASK_NOTE_MAX,
    CALENDAR_TASK_TITLE_MAX,
    type CalendarTask,
    type CalendarTaskInput,
} from "@beyou/types/calendar/calendar";
import Modal from "../modals/Modal";
import Button from "../Button";
import IconButton from "../../ui/IconButton";
import FormLabel from "../../ui/FormLabel";
import { advanceLabel } from "./calendarFormat";
import { calendarTaskSchema, type CalendarTaskFormValues } from "./calendarTaskSchema";
import { isCalendarTaskGone } from "./calendarErrors";

/** What the dialog is open for: a new task on a day, or an existing task. Null keeps it closed. */
export type CalendarTaskDialogState =
    | { mode: "create"; date: string }
    | { mode: "edit"; task: CalendarTask }
    | null;

type Props = {
    state: CalendarTaskDialogState;
    onClose: () => void;
    /** The task as the server saved it. */
    onSaved: (task: CalendarTask) => void;
    /** The task being edited no longer exists on the server (deleted on another device). */
    onGone?: (id: string) => void;
};

/**
 * Create and edit a calendar task. Title and date are required, everything else is optional,
 * which is the whole point: a dated task has to be quicker to write down than a WhatsApp note.
 *
 * The form is a child of the modal, so it mounts fresh on every open and its defaults always
 * come from the task (or the day) it was opened for.
 */
export default function CalendarTaskDialog({ state, onClose, onSaved, onGone }: Props) {
    const titleId = useId();
    return (
        <Modal isOpen={state !== null} onClose={onClose} labelledBy={titleId} className="max-w-lg">
            {state && (
                <TaskForm state={state} titleId={titleId} onClose={onClose} onSaved={onSaved} onGone={onGone} />
            )}
        </Modal>
    );
}

const FIELD =
    "w-full rounded-control border border-border bg-surface px-3 py-2.5 text-[13.5px] text-text transition-colors duration-200 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-accent/40";

function TaskForm({
    state,
    titleId,
    onClose,
    onSaved,
    onGone,
}: {
    state: NonNullable<CalendarTaskDialogState>;
    titleId: string;
    onClose: () => void;
    onSaved: (task: CalendarTask) => void;
    onGone?: (id: string) => void;
}) {
    const { t } = useTranslation();
    const editing = state.mode === "edit" ? state.task : null;
    const presets: number[] = [...CALENDAR_ADVANCE_PRESETS];
    // A task saved with a value outside the presets (the API takes any minute count up to a
    // week) keeps its value in the select instead of silently becoming "at the time".
    if (editing && !presets.includes(editing.advanceMinutes)) presets.push(editing.advanceMinutes);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<CalendarTaskFormValues>({
        resolver: zodResolver(calendarTaskSchema(t)),
        defaultValues: editing
            ? {
                  title: editing.title,
                  date: editing.date,
                  time: editing.time ?? "",
                  advanceMinutes: editing.advanceMinutes,
                  note: editing.note ?? "",
              }
            : {
                  title: "",
                  date: state.mode === "create" ? state.date : "",
                  time: "",
                  advanceMinutes: 0,
                  note: "",
              },
    });

    const onSubmit = async (values: CalendarTaskFormValues) => {
        const note = values.note.trim();
        const input: CalendarTaskInput = {
            title: values.title.trim(),
            date: values.date,
            time: values.time === "" ? null : values.time,
            advanceMinutes: values.advanceMinutes,
            note: note === "" ? null : note,
        };
        const response = editing
            ? await editCalendarTask(editing.id, input, t)
            : await createCalendarTask(input, t);

        if (response.success) {
            toast.success(t(editing ? "CalendarTaskUpdated" : "CalendarTaskCreated"));
            onSaved(response.success);
            onClose();
            return;
        }
        if (editing && isCalendarTaskGone(response.error)) {
            // Deleted on another device while this dialog was open: nothing left to save into.
            toast.info(t("CALENDAR_TASK_NOT_FOUND"));
            onGone?.(editing.id);
            onClose();
            return;
        }
        toast.error(getFriendlyErrorMessage(t, response.error));
    };

    return (
        <div className="w-full text-text" data-testid="calendar-task-dialog">
            <div className="flex items-center gap-3">
                <h2 id={titleId} className="text-base font-semibold tracking-[-0.01em] text-text">
                    {t(editing ? "CalendarEditTask" : "CalendarNewTask")}
                </h2>
                <IconButton label={t("Close")} onClick={onClose} className="ml-auto">
                    <X size={18} aria-hidden="true" />
                </IconButton>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-3.5" noValidate>
                <div>
                    <FormLabel htmlFor="calendar-task-title" required>
                        {t("CalendarTaskTitle")}
                    </FormLabel>
                    <input
                        id="calendar-task-title"
                        type="text"
                        maxLength={CALENDAR_TASK_TITLE_MAX}
                        placeholder={t("CalendarTaskTitlePlaceholder")}
                        data-testid="calendar-task-title"
                        aria-invalid={errors.title ? true : undefined}
                        className={`${FIELD} ${errors.title ? "border-danger" : ""}`}
                        {...register("title")}
                    />
                    {errors.title?.message && (
                        <p className="mt-1.5 text-xs text-danger" data-testid="calendar-task-title-error">
                            {errors.title.message}
                        </p>
                    )}
                </div>

                {/* Date and time side by side from `md`; stacked on phones, where two native
                    pickers in one row get cramped (this config's `sm` is only 350px). */}
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="min-w-0">
                        <FormLabel htmlFor="calendar-task-date" required>
                            {t("CalendarTaskDate")}
                        </FormLabel>
                        <input
                            id="calendar-task-date"
                            type="date"
                            data-testid="calendar-task-date"
                            aria-invalid={errors.date ? true : undefined}
                            className={`${FIELD} ${errors.date ? "border-danger" : ""}`}
                            {...register("date")}
                        />
                        {errors.date?.message && (
                            <p className="mt-1.5 text-xs text-danger" data-testid="calendar-task-date-error">
                                {errors.date.message}
                            </p>
                        )}
                    </div>
                    <div className="min-w-0">
                        <FormLabel htmlFor="calendar-task-time">{t("CalendarTaskTime")}</FormLabel>
                        <input
                            id="calendar-task-time"
                            type="time"
                            data-testid="calendar-task-time"
                            aria-invalid={errors.time ? true : undefined}
                            className={`${FIELD} ${errors.time ? "border-danger" : ""}`}
                            {...register("time")}
                        />
                        {errors.time?.message && (
                            <p className="mt-1.5 text-xs text-danger">{errors.time.message}</p>
                        )}
                    </div>
                </div>

                <div className="mt-4">
                    <FormLabel htmlFor="calendar-task-advance">{t("CalendarTaskAdvance")}</FormLabel>
                    <select
                        id="calendar-task-advance"
                        data-testid="calendar-task-advance"
                        className={FIELD}
                        {...register("advanceMinutes", { valueAsNumber: true })}
                    >
                        {presets.map((minutes) => (
                            <option key={minutes} value={minutes}>
                                {advanceLabel(t, minutes)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mt-4">
                    <FormLabel htmlFor="calendar-task-note">{t("CalendarTaskNote")}</FormLabel>
                    <textarea
                        id="calendar-task-note"
                        rows={3}
                        maxLength={CALENDAR_TASK_NOTE_MAX}
                        data-testid="calendar-task-note"
                        className={`${FIELD} resize-y`}
                        {...register("note")}
                    />
                    {errors.note?.message && (
                        <p className="mt-1.5 text-xs text-danger">{errors.note.message}</p>
                    )}
                </div>

                <div className="mt-5 flex justify-end gap-2">
                    <Button text={t("Cancel")} mode="ghost" size="medium" type="button" onClick={onClose} />
                    <Button
                        text={t("CalendarTaskSave")}
                        mode="primary"
                        size="medium"
                        type="submit"
                        disabled={isSubmitting}
                        testId="calendar-task-save"
                    />
                </div>
            </form>
        </div>
    );
}
