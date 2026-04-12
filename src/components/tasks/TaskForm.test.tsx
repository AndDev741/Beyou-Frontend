import { renderWithProviders } from "../../test/test-utils";
import TaskForm from "./TaskForm";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";

const mockCreateTask = vi.fn().mockResolvedValue({});
const mockGetTasks = vi.fn().mockResolvedValue({ success: [] });
const mockGetCategories = vi.fn().mockResolvedValue({
    success: [{ id: "cat-1", name: "Health", iconId: "heart", color: "#FF0000" }]
});

vi.mock("../../services/tasks/createTask", () => ({
    default: (...args: unknown[]) => mockCreateTask(...args)
}));

vi.mock("../../services/tasks/getTasks", () => ({
    default: (...args: unknown[]) => mockGetTasks(...args)
}));

vi.mock("../../services/categories/getCategories", () => ({
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

    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    expect(await screen.findByText("YupNameRequired")).toBeInTheDocument();
    expect(await screen.findByText("YupIconRequired")).toBeInTheDocument();
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
    fireEvent.change(screen.getByPlaceholderText("Clean the house"), {
        target: { value: "My Task" }
    });

    // Task form allows importance/difficulty to both be 0 (unset), so skip them.

    // Click an icon from the icon grid (rendered as <p> elements with cursor-pointer class)
    await waitFor(() => {
        const icons = document.querySelectorAll("p.cursor-pointer");
        expect(icons.length).toBeGreaterThan(0);
    });
    fireEvent.click(document.querySelectorAll("p.cursor-pointer")[0]);

    // Submit the form
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

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
