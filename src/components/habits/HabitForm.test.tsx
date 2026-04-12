import { renderWithProviders } from "../../test/test-utils";
import HabitForm from "./HabitForm";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";

const mockCreateHabit = vi.fn().mockResolvedValue({});
const mockGetHabits = vi.fn().mockResolvedValue({ success: [] });
const mockGetCategories = vi.fn().mockResolvedValue({
    success: [{ id: "cat-1", name: "Health", iconId: "heart", color: "#FF0000" }]
});

vi.mock("../../services/habits/createHabit", () => ({
    default: (...args: unknown[]) => mockCreateHabit(...args)
}));

vi.mock("../../services/habits/getHabits", () => ({
    default: (...args: unknown[]) => mockGetHabits(...args)
}));

vi.mock("../../services/categories/getCategories", () => ({
    default: (...args: unknown[]) => mockGetCategories(...args)
}));

beforeEach(() => {
    mockCreateHabit.mockReset().mockResolvedValue({});
    mockGetHabits.mockReset().mockResolvedValue({ success: [] });
    mockGetCategories.mockReset().mockResolvedValue({
        success: [{ id: "cat-1", name: "Health", iconId: "heart", color: "#FF0000" }]
    });
});


test("shows required errors for create habit", async () => {
    renderWithProviders(<HabitForm mode="create" setHabits={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    expect(await screen.findByText("YupNameRequired")).toBeInTheDocument();
    expect(await screen.findByText("YupIconRequired")).toBeInTheDocument();
    expect(await screen.findByText("YupRequiredCategories")).toBeInTheDocument();
});


test("shows API validation error when backend returns INVALID_REQUEST", async () => {
    mockCreateHabit.mockResolvedValueOnce({
        error: {
            errorKey: "INVALID_REQUEST",
            message: "Validation failed",
            details: { name: "Name is Required" }
        }
    });

    renderWithProviders(<HabitForm mode="create" setHabits={vi.fn()} />);

    // Fill name (min 2 chars)
    fireEvent.change(screen.getByPlaceholderText("CategoryNamePlaceholder"), {
        target: { value: "My Habit" }
    });

    // Select importance (click "Low" radio = value 1)
    fireEvent.click(screen.getByLabelText("Low"));

    // Select difficulty (click "Easy" radio = value 1)
    fireEvent.click(screen.getByLabelText("Easy"));

    // Select experience (select element)
    fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "0" }
    });

    // Wait for categories to load, then select one
    const categoryEl = await screen.findByText("Health");
    fireEvent.click(categoryEl);

    // Click an icon from the icon grid (rendered as <p> elements with cursor-pointer class)
    await waitFor(() => {
        const icons = document.querySelectorAll("p.cursor-pointer");
        expect(icons.length).toBeGreaterThan(0);
    });
    fireEvent.click(document.querySelectorAll("p.cursor-pointer")[0]);

    // Submit the form
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    // createHabit should be called since all fields are filled
    await waitFor(
        () => {
            expect(mockCreateHabit).toHaveBeenCalled();
        },
        { timeout: 3000 }
    );

    // The ErrorNotice displays getFriendlyErrorMessage(t, error) which returns t("INVALID_REQUEST") = "INVALID_REQUEST"
    await waitFor(() => {
        expect(screen.getByText("INVALID_REQUEST")).toBeInTheDocument();
    });
});
