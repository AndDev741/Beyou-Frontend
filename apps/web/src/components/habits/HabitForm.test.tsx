import { renderWithProviders } from "../../test/test-utils";
import HabitForm from "./HabitForm";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";

const mockCreateHabit = vi.fn().mockResolvedValue({});
const mockGetHabits = vi.fn().mockResolvedValue({ success: [] });
const mockGetCategories = vi.fn().mockResolvedValue({
    success: [{ id: "cat-1", name: "Health", iconId: "heart", color: "#FF0000" }]
});

vi.mock("@beyou/api/habits/createHabit", () => ({
    default: (...args: unknown[]) => mockCreateHabit(...args)
}));

vi.mock("@beyou/api/habits/getHabits", () => ({
    default: (...args: unknown[]) => mockGetHabits(...args)
}));

vi.mock("@beyou/api/categories/getCategories", () => ({
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

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("YupNameRequired")).toBeInTheDocument();
    expect(await screen.findByText("YupIconRequired")).toBeInTheDocument();
    expect(await screen.findByText("YupRequiredCategories")).toBeInTheDocument();
});


test("does not double-submit while a create request is in flight", async () => {
    // Keep the create request pending until we resolve it manually, so we can
    // observe the in-flight state.
    let resolveCreate: (value: unknown) => void = () => {};
    mockCreateHabit.mockImplementationOnce(
        () => new Promise((resolve) => { resolveCreate = resolve; })
    );

    renderWithProviders(<HabitForm mode="create" setHabits={vi.fn()} />);

    // Fill a valid form (same recipe as the INVALID_REQUEST test below).
    fireEvent.change(screen.getByPlaceholderText("CategoryNamePlaceholder"), {
        target: { value: "My Habit" }
    });
    fireEvent.click(screen.getByLabelText("Low"));
    fireEvent.click(screen.getByLabelText("Easy"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "0" } });
    const categoryEl = await screen.findByText("Health");
    fireEvent.click(categoryEl);
    await waitFor(() => {
        expect(document.querySelectorAll("button.cursor-pointer").length).toBeGreaterThan(0);
    });
    fireEvent.click(document.querySelectorAll("button.cursor-pointer")[0]);

    const submit = screen.getByRole("button", { name: "Create" });

    // First click starts the request…
    fireEvent.click(submit);
    await waitFor(() => expect(mockCreateHabit).toHaveBeenCalledTimes(1));

    // …and the button must be disabled while it is in flight, so a second
    // click cannot fire a duplicate create (the Bug-5 double-submit vector).
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(mockCreateHabit).toHaveBeenCalledTimes(1);

    // Once the request settles the button is usable again.
    resolveCreate({});
    await waitFor(() => expect(submit).not.toBeDisabled());
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

    // Click an icon from the icon grid (rendered as <button> tiles with cursor-pointer class)
    await waitFor(() => {
        const icons = document.querySelectorAll("button.cursor-pointer");
        expect(icons.length).toBeGreaterThan(0);
    });
    fireEvent.click(document.querySelectorAll("button.cursor-pointer")[0]);

    // Submit the form
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

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
