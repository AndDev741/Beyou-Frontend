import { renderWithProviders } from "../../test/test-utils";
import TaskForm from "./TaskForm";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "@beyou/state/rootReducer";

const mockCreateTask = vi.fn().mockResolvedValue({});
const mockGetTasks = vi.fn().mockResolvedValue({ success: [] });
const mockGetCategories = vi.fn().mockResolvedValue({
    success: [{ id: "cat-1", name: "Health", iconId: "heart", color: "#FF0000" }]
});

vi.mock("@beyou/api/tasks/createTask", () => ({
    default: (...args: unknown[]) => mockCreateTask(...args)
}));

vi.mock("@beyou/api/tasks/getTasks", () => ({
    default: (...args: unknown[]) => mockGetTasks(...args)
}));

vi.mock("@beyou/api/categories/getCategories", () => ({
    default: (...args: unknown[]) => mockGetCategories(...args)
}));

beforeEach(() => {
    mockCreateTask.mockReset().mockResolvedValue({});
    mockGetTasks.mockReset().mockResolvedValue({ success: [] });
    mockGetCategories.mockReset().mockResolvedValue({
        success: [{ id: "cat-1", name: "Health", iconId: "heart", color: "#FF0000" }]
    });
});


test("shows required errors for create task", async () => {
    renderWithProviders(<TaskForm mode="create" setTasks={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Save task" }));

    expect(await screen.findByText("YupNameRequired")).toBeInTheDocument();
    expect(await screen.findByText("YupIconRequired")).toBeInTheDocument();
});


/**
 * Same rule as the habit form: the refetch after a save has to reach the shared store, not
 * only this page's list, because the focus screen resolves task names from the slice.
 */
test("hands the list it refetches after a save to the shared store too", async () => {
    const saved = [{ id: "t-1", name: "My Task", iconId: "icon" }];
    mockCreateTask.mockResolvedValueOnce({ success: "Task created" });
    mockGetTasks.mockResolvedValue({ success: saved });
    const store = configureStore({ reducer: rootReducer });
    const setTasks = vi.fn();

    renderWithProviders(<TaskForm mode="create" setTasks={setTasks} />, { storeOverride: store });

    fireEvent.change(screen.getByPlaceholderText("TaskNamePlaceholder"), {
        target: { value: "My Task" }
    });
    fireEvent.click(screen.getByRole("radio", { name: "Low" }));
    fireEvent.click(screen.getByRole("radio", { name: "Easy" }));
    const iconTiles = await screen.findAllByRole("button", { name: /^Icon:/i });
    fireEvent.click(iconTiles[0]);

    fireEvent.click(screen.getByRole("button", { name: "Save task" }));

    await waitFor(() => expect(setTasks).toHaveBeenCalledWith(saved));
    expect(store.getState().tasks.tasks).toEqual(saved);
});

test("shows API validation error when backend returns INVALID_REQUEST", async () => {
    mockCreateTask.mockResolvedValueOnce({
        error: {
            errorKey: "INVALID_REQUEST",
            message: "Validation failed",
            details: { name: "Name is Required" }
        }
    });

    renderWithProviders(<TaskForm mode="create" setTasks={vi.fn()} />);

    // Fill name (min 2 chars)
    fireEvent.change(screen.getByPlaceholderText("TaskNamePlaceholder"), {
        target: { value: "My Task" }
    });

    // Set importance and difficulty (min 1 required, matching backend @Min(1) @Max(5))
    fireEvent.click(screen.getByRole("radio", { name: "Low" }));
    fireEvent.click(screen.getByRole("radio", { name: "Easy" }));

    // Click the first icon from the compact picker (tiles with aria-label "Icon: …").
    const iconTiles = await screen.findAllByRole("button", { name: /^Icon:/i });
    fireEvent.click(iconTiles[0]);

    // Submit the form
    fireEvent.click(screen.getByRole("button", { name: "Save task" }));

    // createTask should be called since name + icon are filled
    await waitFor(
        () => {
            expect(mockCreateTask).toHaveBeenCalled();
        },
        { timeout: 3000 }
    );

    // The ErrorNotice displays getFriendlyErrorMessage(t, error) which returns t("INVALID_REQUEST") = "INVALID_REQUEST"
    await waitFor(() => {
        expect(screen.getByText("INVALID_REQUEST")).toBeInTheDocument();
    });
});

/**
 * A note becoming a task opens this form filled in, and saves through the conversion endpoint
 * instead of `createTask`. Everything after the save stays the form's: the list refetch that
 * reaches the store, the toast, closing.
 */
test("opens with initial values and saves through onCreate instead of createTask", async () => {
    const tasks = [{ id: "t-9", name: "Renew passport", iconId: "icon" }];
    mockGetTasks.mockResolvedValue({ success: tasks });
    const onCreate = vi.fn().mockResolvedValue({ success: { taskId: "t-9" } });
    const onClose = vi.fn();
    const store = configureStore({ reducer: rootReducer });

    renderWithProviders(
        <TaskForm
            mode="create"
            title="From a note"
            initialValues={{ name: "Renew passport", description: "Book the slot first" }}
            onCreate={onCreate}
            createdMessage="Turned into a task"
            onClose={onClose}
        />,
        { storeOverride: store }
    );

    expect(screen.getByRole("heading", { name: "From a note" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("TaskNamePlaceholder")).toHaveValue("Renew passport");
    expect(screen.getByPlaceholderText("TaskDescriptionPlaceholder")).toHaveValue("Book the slot first");

    const iconTiles = await screen.findAllByRole("button", { name: /^Icon:/i });
    fireEvent.click(iconTiles[0]);
    fireEvent.click(screen.getByRole("button", { name: "Save task" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate.mock.calls[0][0]).toMatchObject({
        name: "Renew passport",
        description: "Book the slot first",
        iconId: expect.any(String),
        categoriesId: [],
        oneTimeTask: false,
    });
    expect(mockCreateTask).not.toHaveBeenCalled();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(store.getState().tasks.tasks).toEqual(tasks);
});

test("a refused onCreate keeps the form open with the reason", async () => {
    const onCreate = vi.fn().mockResolvedValue({ error: { errorKey: "QUICK_NOTE_ALREADY_CONVERTED" } });
    const onClose = vi.fn();

    renderWithProviders(
        <TaskForm mode="create" initialValues={{ name: "Renew passport" }} onCreate={onCreate} onClose={onClose} />
    );

    const iconTiles = await screen.findAllByRole("button", { name: /^Icon:/i });
    fireEvent.click(iconTiles[0]);
    fireEvent.click(screen.getByRole("button", { name: "Save task" }));

    expect(await screen.findByText("QUICK_NOTE_ALREADY_CONVERTED")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(mockGetTasks).not.toHaveBeenCalled();
});
