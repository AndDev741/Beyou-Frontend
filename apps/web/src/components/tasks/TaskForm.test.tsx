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
