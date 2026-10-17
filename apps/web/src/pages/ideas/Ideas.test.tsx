import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, test, vi, type Mock } from "vitest";
import { toast } from "react-toastify";
import rootReducer from "@beyou/state/rootReducer";
import {
    archiveQuickNote,
    convertQuickNoteToTask,
    createQuickNote,
    deleteQuickNote,
    editQuickNote,
    getArchivedQuickNotes,
    getQuickNotes,
    restoreQuickNote,
    saveQuickNoteLayout,
    tidyQuickNotes,
} from "@beyou/api/quickNote/quickNoteApi";
import getTasks from "@beyou/api/tasks/getTasks";
import getCategories from "@beyou/api/categories/getCategories";
import type { QuickNote } from "@beyou/types/quickNote/quickNote";
import { renderWithProviders } from "../../test/test-utils";
import { dragNode } from "../../test/reactFlowEnv";
import Ideas from "./Ideas";

vi.mock("@beyou/api/quickNote/quickNoteApi", () => ({
    getQuickNotes: vi.fn(),
    getArchivedQuickNotes: vi.fn(),
    createQuickNote: vi.fn(),
    editQuickNote: vi.fn(),
    saveQuickNoteLayout: vi.fn(),
    tidyQuickNotes: vi.fn(),
    archiveQuickNote: vi.fn(),
    restoreQuickNote: vi.fn(),
    deleteQuickNote: vi.fn(),
    convertQuickNoteToTask: vi.fn(),
}));
vi.mock("@beyou/api/tasks/getTasks", () => ({ default: vi.fn() }));
vi.mock("@beyou/api/categories/getCategories", () => ({ default: vi.fn() }));
vi.mock("../../components/useAuthGuard", () => ({ default: () => {} }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const note = (overrides: Partial<QuickNote>): QuickNote => ({
    id: "a",
    text: "Buy milk",
    color: "YELLOW",
    x: 0,
    y: 0,
    z: 1,
    archivedAt: null,
    convertedTaskId: null,
    createdAt: "2026-10-17T10:00:00Z",
    updatedAt: "2026-10-17T10:00:00Z",
    ...overrides,
});

const milk = note({});
const mom = note({ id: "b", text: "Call mom", color: "PINK", x: 224, z: 2, createdAt: "2026-10-17T10:01:00Z" });
const archivedAt = "2026-10-17T12:00:00Z";

const renderPage = () => {
    const store = configureStore({ reducer: rootReducer });
    const utils = renderWithProviders(<Ideas />, { storeOverride: store, route: "/ideas" });
    return { ...utils, store };
};

/** The note on the board, found by its text (the i18n stub drops the label's interpolation). */
const noteOnBoard = (text: string) => {
    const el = screen.getByText(text).closest(".react-flow__node");
    if (!el) throw new Error(`no note "${text}" on the board`);
    return el as HTMLElement;
};

const loaded = async (text = "Buy milk") => {
    await screen.findByText(text);
};

beforeEach(() => {
    (getQuickNotes as Mock).mockResolvedValue({ success: [milk, mom] });
    (getTasks as Mock).mockResolvedValue({ success: [] });
    (getCategories as Mock).mockResolvedValue({ success: [] });
});

describe("Ideas page", () => {
    test("loads the board and draws every note as a focusable, labelled note", async () => {
        renderPage();
        await loaded();

        expect(screen.getByText("Call mom")).toBeInTheDocument();
        expect(screen.getByRole("application", { name: "IdeasBoardLabel" })).toBeInTheDocument();
        const notes = screen.getAllByRole("group", { name: "IdeasNoteLabel" });
        expect(notes).toHaveLength(2);
        notes.forEach((el) => expect(el).toHaveAttribute("tabindex", "0"));
        expect(screen.getByTestId("ideas-count")).toHaveTextContent("IdeasCount");
        expect(screen.queryByTestId("ideas-empty")).not.toBeInTheDocument();
    });

    test("an empty board says how to fill it", async () => {
        (getQuickNotes as Mock).mockResolvedValue({ success: [] });
        renderPage();

        const empty = await screen.findByTestId("ideas-empty");
        expect(within(empty).getByText("IdeasEmptyTitle")).toBeInTheDocument();
        expect(within(empty).getByText("IdeasEmptyBody")).toBeInTheDocument();
        expect(within(empty).getByText("IdeasEmptyHintWeb")).toBeInTheDocument();
    });

    test("a board that fails to load offers to try again", async () => {
        (getQuickNotes as Mock).mockResolvedValueOnce({ error: { message: "down" } });
        renderPage();

        const alert = await screen.findByTestId("ideas-load-error");
        fireEvent.click(within(alert).getByRole("button", { name: "TryAgain" }));

        await loaded();
        expect(getQuickNotes).toHaveBeenCalledTimes(2);
    });

    test("Enter in the capture field saves the idea with no spot, and Shift+Enter is a new line", async () => {
        const created = note({ id: "c", text: "Plan the trip", x: 448, z: 3 });
        (createQuickNote as Mock).mockResolvedValue({ success: created });
        renderPage();
        await loaded();

        const field = screen.getByLabelText("IdeasCaptureLabel");
        fireEvent.change(field, { target: { value: "Plan the trip" } });
        fireEvent.keyDown(field, { key: "Enter", shiftKey: true });
        expect(createQuickNote).not.toHaveBeenCalled();

        fireEvent.keyDown(field, { key: "Enter" });

        await waitFor(() => expect(createQuickNote).toHaveBeenCalledWith({ text: "Plan the trip" }, expect.any(Function)));
        expect(await screen.findByText("Plan the trip")).toBeInTheDocument();
        await waitFor(() => expect(field).toHaveValue(""));
    });

    test("a full board shows the limit message and keeps what was typed", async () => {
        (createQuickNote as Mock).mockResolvedValue({ error: { errorKey: "QUICK_NOTE_LIMIT_REACHED" } });
        renderPage();
        await loaded();

        const field = screen.getByLabelText("IdeasCaptureLabel");
        fireEvent.change(field, { target: { value: "One more" } });
        fireEvent.click(screen.getByRole("button", { name: "IdeasAdd" }));

        // The i18n stub answers the key itself; in the app it is the translated sentence.
        expect(await screen.findByRole("alert")).toHaveTextContent("QUICK_NOTE_LIMIT_REACHED");
        expect(field).toHaveValue("One more");
    });

    test("the chars-left hint shows near the limit", async () => {
        renderPage();
        await loaded();

        const field = screen.getByLabelText("IdeasCaptureLabel");
        fireEvent.change(field, { target: { value: "x".repeat(400) } });
        expect(screen.queryByTestId("ideas-capture-left")).not.toBeInTheDocument();

        fireEvent.change(field, { target: { value: "x".repeat(460) } });
        expect(screen.getByTestId("ideas-capture-left")).toHaveTextContent("IdeasCharsLeft");
        expect(field).toHaveAttribute("maxlength", "500");
    });

    test("dropping a note brings it to the front at once and saves the spot", async () => {
        let answer: (value: unknown) => void = () => {};
        (saveQuickNoteLayout as Mock).mockImplementation(() => new Promise((resolve) => (answer = resolve)));
        const { store } = renderPage();
        await loaded();

        dragNode(noteOnBoard("Buy milk"), { x: 10, y: 10 }, { x: 110, y: 70 });

        await waitFor(() => expect(saveQuickNoteLayout).toHaveBeenCalledTimes(1));
        const [positions] = (saveQuickNoteLayout as Mock).mock.calls[0];
        // dropPosition: rounded board units, and a z above every other note.
        expect(positions).toEqual([{ id: "a", x: expect.any(Number), y: expect.any(Number), z: 3 }]);
        expect(Number.isInteger(positions[0].x) && Number.isInteger(positions[0].y)).toBe(true);
        expect(positions[0].x).not.toBe(0);
        // Optimistic: in front before the server answers.
        expect(store.getState().quickNotes.active.map((n) => n.id)).toEqual(["b", "a"]);

        await act(async () => answer({ success: [mom, { ...milk, ...positions[0] }] }));
        expect(store.getState().quickNotes.active.find((n) => n.id === "a")).toMatchObject(positions[0]);
    });

    test("a refused layout save says why and re-reads the board", async () => {
        (saveQuickNoteLayout as Mock).mockResolvedValue({ error: { errorKey: "QUICK_NOTE_NOT_FOUND" } });
        const { store } = renderPage();
        await loaded();

        dragNode(noteOnBoard("Buy milk"), { x: 10, y: 10 }, { x: 110, y: 70 });

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith("QUICK_NOTE_NOT_FOUND"));
        await waitFor(() => expect(getQuickNotes).toHaveBeenCalledTimes(2));
        expect(store.getState().quickNotes.active.find((n) => n.id === "a")).toMatchObject({ x: 0, y: 0, z: 1 });
    });

    test("Tidy up lines the notes up where the server put them", async () => {
        (tidyQuickNotes as Mock).mockResolvedValue({
            success: [
                { ...milk, x: 0, y: 0, z: 0 },
                { ...mom, x: 0, y: 184, z: 1 },
            ],
        });
        const { store } = renderPage();
        await loaded();

        fireEvent.click(screen.getByRole("button", { name: "IdeasTidy" }));

        await waitFor(() => expect(tidyQuickNotes).toHaveBeenCalled());
        await waitFor(() => expect(store.getState().quickNotes.active.find((n) => n.id === "b")).toMatchObject({ x: 0, y: 184 }));
        await waitFor(() => expect(noteOnBoard("Call mom").style.transform).toBe("translate(0px,184px)"));
    });

    test("a swatch recolours the note", async () => {
        (editQuickNote as Mock).mockResolvedValue({ success: { ...milk, color: "BLUE" } });
        const { store } = renderPage();
        await loaded();

        const board = noteOnBoard("Buy milk");
        fireEvent.click(within(board).getByRole("button", { name: "IdeasColor_BLUE" }));

        await waitFor(() =>
            expect(editQuickNote).toHaveBeenCalledWith("a", { text: "Buy milk", color: "BLUE" }, expect.any(Function))
        );
        expect(store.getState().quickNotes.active.find((n) => n.id === "a")?.color).toBe("BLUE");
    });

    test("double-click a note to edit it in place: Ctrl+Enter saves, Escape puts it back", async () => {
        (editQuickNote as Mock).mockResolvedValue({ success: { ...milk, text: "Buy oat milk" } });
        renderPage();
        await loaded();

        fireEvent.doubleClick(noteOnBoard("Buy milk"));
        let editor = await screen.findByTestId("quick-note-editor");
        fireEvent.change(editor, { target: { value: "Buy milk and eggs" } });
        fireEvent.keyDown(editor, { key: "Escape" });
        expect(screen.queryByTestId("quick-note-editor")).not.toBeInTheDocument();
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
        expect(editQuickNote).not.toHaveBeenCalled();

        // Enter on the focused note opens the editor too.
        fireEvent.keyDown(noteOnBoard("Buy milk"), { key: "Enter" });
        editor = await screen.findByTestId("quick-note-editor");
        fireEvent.change(editor, { target: { value: "Buy oat milk" } });
        fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });

        await waitFor(() =>
            expect(editQuickNote).toHaveBeenCalledWith("a", { text: "Buy oat milk", color: "YELLOW" }, expect.any(Function))
        );
        expect(await screen.findByText("Buy oat milk")).toBeInTheDocument();
    });

    test("double-click an empty spot writes a note right there", async () => {
        const created = note({ id: "c", text: "Right here", x: 100, y: 80, z: 3 });
        (createQuickNote as Mock).mockResolvedValue({ success: created });
        renderPage();
        await loaded();

        const pane = document.querySelector(".react-flow__pane") as HTMLElement;
        fireEvent.doubleClick(pane, { clientX: 400, clientY: 300 });

        const editor = await screen.findByTestId("quick-note-editor");
        fireEvent.change(editor, { target: { value: "Right here" } });
        fireEvent.blur(editor);

        await waitFor(() => expect(createQuickNote).toHaveBeenCalledTimes(1));
        const [input] = (createQuickNote as Mock).mock.calls[0];
        expect(input).toEqual({ text: "Right here", color: "YELLOW", x: expect.any(Number), y: expect.any(Number) });
        expect(Number.isInteger(input.x) && Number.isInteger(input.y)).toBe(true);
        // The draft hands over to the saved note.
        await waitFor(() => expect(screen.queryByTestId("quick-note-draft")).not.toBeInTheDocument());
        expect(screen.getByText("Right here").closest("[data-testid='quick-note']")).toHaveAttribute("data-note-id", "c");
    });

    test("a draft left empty is dropped without a request", async () => {
        renderPage();
        await loaded();

        fireEvent.doubleClick(document.querySelector(".react-flow__pane") as HTMLElement, { clientX: 400, clientY: 300 });
        fireEvent.blur(await screen.findByTestId("quick-note-editor"));

        await waitFor(() => expect(screen.queryByTestId("quick-note-draft")).not.toBeInTheDocument());
        expect(createQuickNote).not.toHaveBeenCalled();
    });

    test("Archive takes the note off the board, and Archived lists it", async () => {
        const archivedMilk = { ...milk, archivedAt };
        (archiveQuickNote as Mock).mockResolvedValue({ success: archivedMilk });
        (getArchivedQuickNotes as Mock).mockResolvedValue({ success: [archivedMilk] });
        renderPage();
        await loaded();

        fireEvent.click(within(noteOnBoard("Buy milk")).getByRole("button", { name: "IdeasArchive" }));

        await waitFor(() => expect(screen.queryByText("Buy milk")).not.toBeInTheDocument());
        expect(toast.success).toHaveBeenCalledWith("IdeasArchivedToast");

        const toggle = screen.getByRole("button", { name: "IdeasArchived" });
        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "true");

        const panel = await screen.findByRole("dialog", { name: "IdeasArchived" });
        expect(await within(panel).findByText("Buy milk")).toBeInTheDocument();
        expect(getArchivedQuickNotes).toHaveBeenCalledTimes(1);
    });

    test("from Archived a note goes back to the board or is deleted for good", async () => {
        const archivedMilk = { ...milk, archivedAt };
        const convertedIdea = note({ id: "d", text: "Write the report", archivedAt, convertedTaskId: "task-1" });
        (getQuickNotes as Mock).mockResolvedValue({ success: [mom] });
        (getArchivedQuickNotes as Mock).mockResolvedValue({ success: [archivedMilk, convertedIdea] });
        (restoreQuickNote as Mock).mockResolvedValue({ success: { ...milk, z: 3 } });
        (deleteQuickNote as Mock).mockResolvedValue({ success: true });
        renderPage();
        await loaded("Call mom");

        fireEvent.click(screen.getByRole("button", { name: "IdeasArchived" }));
        const panel = await screen.findByRole("dialog", { name: "IdeasArchived" });
        await within(panel).findByText("Buy milk");

        const items = within(panel).getAllByTestId("archived-note");
        expect(within(items[1]).getByText("IdeasBecameTask")).toBeInTheDocument();
        expect(within(items[0]).queryByText("IdeasBecameTask")).not.toBeInTheDocument();

        fireEvent.click(within(items[0]).getByRole("button", { name: "IdeasRestore" }));
        await waitFor(() => expect(restoreQuickNote).toHaveBeenCalledWith("a", expect.any(Function)));
        await waitFor(() => expect(within(panel).queryByText("Buy milk")).not.toBeInTheDocument());
        await waitFor(() => expect(noteOnBoard("Buy milk")).toBeInTheDocument());

        fireEvent.click(within(panel).getByRole("button", { name: "IdeasDeleteForever" }));
        const confirm = await screen.findByRole("dialog", { name: "IdeasDeleteConfirm" });
        fireEvent.click(within(confirm).getByRole("button", { name: "IdeasDeleteForever" }));

        await waitFor(() => expect(deleteQuickNote).toHaveBeenCalledWith("d", expect.any(Function)));
        await waitFor(() => expect(within(panel).queryByText("Write the report")).not.toBeInTheDocument());
        expect(screen.queryByRole("dialog", { name: "IdeasDeleteConfirm" })).not.toBeInTheDocument();
    });

    test("Make it a task opens the task form with the note and converts it in one go", async () => {
        const longIdea = note({ id: "e", text: "Renew passport\nBook the appointment first", x: 448, z: 3 });
        (getQuickNotes as Mock).mockResolvedValue({ success: [milk, longIdea] });
        (convertQuickNoteToTask as Mock).mockResolvedValue({
            success: { note: { ...longIdea, archivedAt, convertedTaskId: "task-9" }, taskId: "task-9" },
        });
        const tasks = [{ id: "task-9", name: "Renew passport" }];
        (getTasks as Mock).mockResolvedValue({ success: tasks });
        const { store } = renderPage();
        await screen.findByText(/Renew passport/);

        const board = screen.getByText(/Renew passport/).closest(".react-flow__node") as HTMLElement;
        fireEvent.click(within(board).getByRole("button", { name: "IdeasMakeTask" }));

        const dialog = await screen.findByRole("dialog", { name: "IdeasMakeTaskTitle" });
        expect(within(dialog).getByPlaceholderText("TaskNamePlaceholder")).toHaveValue("Renew passport");
        expect(within(dialog).getByPlaceholderText("TaskDescriptionPlaceholder")).toHaveValue("Book the appointment first");

        const icons = await within(dialog).findAllByRole("button", { name: /^Icon:/i });
        fireEvent.click(icons[0]);
        fireEvent.click(within(dialog).getByRole("button", { name: "Save task" }));

        await waitFor(() => expect(convertQuickNoteToTask).toHaveBeenCalledTimes(1));
        const [id, values] = (convertQuickNoteToTask as Mock).mock.calls[0];
        expect(id).toBe("e");
        expect(values).toMatchObject({
            name: "Renew passport",
            description: "Book the appointment first",
            iconId: expect.any(String),
            categoriesId: [],
        });

        await waitFor(() => expect(screen.queryByRole("dialog", { name: "IdeasMakeTaskTitle" })).not.toBeInTheDocument());
        expect(toast.success).toHaveBeenCalledWith("IdeasConvertedToast");
        // Off the board, and the task list in the store has the new task.
        expect(store.getState().quickNotes.active.map((n) => n.id)).toEqual(["a"]);
        expect(getTasks).toHaveBeenCalled();
        expect(store.getState().tasks.tasks).toEqual(tasks);
    });

    test("Alt+N on this page focuses the capture field", async () => {
        renderPage();
        await loaded();
        const field = screen.getByLabelText("IdeasCaptureLabel");
        expect(field).not.toHaveFocus();

        fireEvent.keyDown(document.body, { key: "˜", code: "KeyN", altKey: true });

        expect(field).toHaveFocus();
    });
});
