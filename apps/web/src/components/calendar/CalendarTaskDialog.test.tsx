import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import type { CalendarTask } from "@beyou/types/calendar/calendar";
import { createCalendarTask, editCalendarTask } from "@beyou/api/calendar/calendarApi";
import { toast } from "react-toastify";
import { renderWithProviders } from "../../test/test-utils";
import CalendarTaskDialog, { type CalendarTaskDialogState } from "./CalendarTaskDialog";

vi.mock("@beyou/api/calendar/calendarApi", () => ({
    createCalendarTask: vi.fn(),
    editCalendarTask: vi.fn(),
}));

vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const saved: CalendarTask = {
    id: "t9",
    title: "Book the dentist",
    note: null,
    date: "2026-10-14",
    time: "10:00",
    advanceMinutes: 60,
    completed: false,
    completedAt: null,
    xpAwarded: 0,
    notifyAt: "2026-10-14T12:00:00Z",
};

const renderDialog = (state: CalendarTaskDialogState) => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    const onGone = vi.fn();
    renderWithProviders(
        <CalendarTaskDialog state={state} onClose={onClose} onSaved={onSaved} onGone={onGone} />,
    );
    return { onSaved, onClose, onGone };
};

const save = () => userEvent.click(screen.getByTestId("calendar-task-save"));

describe("validation", () => {
    test("refuses a one-letter title and sends nothing", async () => {
        renderDialog({ mode: "create", date: "2026-10-14" });

        userEvent.type(screen.getByTestId("calendar-task-title"), "a");
        save();

        expect(await screen.findByTestId("calendar-task-title-error")).toHaveTextContent("CalendarTitleTooShort");
        expect(createCalendarTask).not.toHaveBeenCalled();
    });

    test("a title of spaces counts as too short", async () => {
        renderDialog({ mode: "create", date: "2026-10-14" });

        userEvent.type(screen.getByTestId("calendar-task-title"), "     ");
        save();

        expect(await screen.findByTestId("calendar-task-title-error")).toHaveTextContent("CalendarTitleTooShort");
        expect(createCalendarTask).not.toHaveBeenCalled();
    });

    test("refuses a task without a date", async () => {
        renderDialog({ mode: "create", date: "2026-10-14" });

        userEvent.type(screen.getByTestId("calendar-task-title"), "Book the dentist");
        fireEvent.change(screen.getByTestId("calendar-task-date"), { target: { value: "" } });
        save();

        expect(await screen.findByTestId("calendar-task-date-error")).toHaveTextContent("CalendarDateRequired");
        expect(createCalendarTask).not.toHaveBeenCalled();
    });
});

describe("saving", () => {
    test("creates with the day it was opened on, no time and no note sent as null", async () => {
        vi.mocked(createCalendarTask).mockResolvedValue({ success: saved });
        const { onSaved, onClose } = renderDialog({ mode: "create", date: "2026-10-14" });

        userEvent.type(screen.getByTestId("calendar-task-title"), "  Book the dentist ");
        save();

        await waitFor(() =>
            expect(createCalendarTask).toHaveBeenCalledWith(
                { title: "Book the dentist", date: "2026-10-14", time: null, advanceMinutes: 0, note: null },
                expect.anything(),
            ),
        );
        expect(onSaved).toHaveBeenCalledWith(saved);
        expect(onClose).toHaveBeenCalled();
    });

    test("sends the time, the advance as a number and the note", async () => {
        vi.mocked(createCalendarTask).mockResolvedValue({ success: saved });
        renderDialog({ mode: "create", date: "2026-10-14" });

        userEvent.type(screen.getByTestId("calendar-task-title"), "Book the dentist");
        fireEvent.change(screen.getByTestId("calendar-task-time"), { target: { value: "10:00" } });
        userEvent.selectOptions(screen.getByTestId("calendar-task-advance"), "60");
        userEvent.type(screen.getByTestId("calendar-task-note"), "Ask about the crown");
        save();

        await waitFor(() =>
            expect(createCalendarTask).toHaveBeenCalledWith(
                {
                    title: "Book the dentist",
                    date: "2026-10-14",
                    time: "10:00",
                    advanceMinutes: 60,
                    note: "Ask about the crown",
                },
                expect.anything(),
            ),
        );
    });

    test("offers every advance preset", () => {
        renderDialog({ mode: "create", date: "2026-10-14" });

        const values = Array.from(
            (screen.getByTestId("calendar-task-advance") as HTMLSelectElement).options,
        ).map((option) => option.value);
        expect(values).toEqual(["0", "15", "30", "60", "120", "1440"]);
    });

    test("edits the task it was opened for, starting from its values", async () => {
        vi.mocked(editCalendarTask).mockResolvedValue({ success: { ...saved, title: "Dentist at 11" } });
        renderDialog({ mode: "edit", task: saved });

        const title = screen.getByTestId("calendar-task-title");
        expect(title).toHaveValue("Book the dentist");
        expect(screen.getByTestId("calendar-task-time")).toHaveValue("10:00");
        expect(screen.getByTestId("calendar-task-advance")).toHaveValue("60");

        userEvent.clear(title);
        userEvent.type(title, "Dentist at 11");
        save();

        await waitFor(() =>
            expect(editCalendarTask).toHaveBeenCalledWith(
                "t9",
                expect.objectContaining({ title: "Dentist at 11", date: "2026-10-14", time: "10:00", advanceMinutes: 60 }),
                expect.anything(),
            ),
        );
        expect(createCalendarTask).not.toHaveBeenCalled();
    });

    /** Deleted on another device while the dialog was open: say so and let it go. */
    test("an edit of a task deleted elsewhere closes the dialog and reports it gone", async () => {
        vi.mocked(editCalendarTask).mockResolvedValue({ error: { errorKey: "CALENDAR_TASK_NOT_FOUND" } });
        const { onGone, onClose, onSaved } = renderDialog({ mode: "edit", task: saved });

        save();

        await waitFor(() => expect(onGone).toHaveBeenCalledWith("t9"));
        expect(onClose).toHaveBeenCalled();
        expect(onSaved).not.toHaveBeenCalled();
        expect(toast.info).toHaveBeenCalledWith("CALENDAR_TASK_NOT_FOUND");
        expect(toast.error).not.toHaveBeenCalled();
    });

    test("the save button stays disabled while the request is in flight", async () => {
        let finish: (value: { success: CalendarTask }) => void = () => {};
        vi.mocked(createCalendarTask).mockReturnValue(new Promise((resolve) => (finish = resolve)));
        renderDialog({ mode: "create", date: "2026-10-14" });

        userEvent.type(screen.getByTestId("calendar-task-title"), "Book the dentist");
        save();

        await waitFor(() => expect(createCalendarTask).toHaveBeenCalledTimes(1));
        expect(screen.getByTestId("calendar-task-save")).toBeDisabled();
        save();
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(createCalendarTask).toHaveBeenCalledTimes(1);

        finish({ success: saved });
        await waitFor(() => expect(createCalendarTask).toHaveBeenCalledTimes(1));
    });
});
