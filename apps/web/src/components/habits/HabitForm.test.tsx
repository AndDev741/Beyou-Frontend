import { renderWithProviders } from "../../test/test-utils";
import HabitForm from "./HabitForm";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "@beyou/state/rootReducer";

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

    fireEvent.click(screen.getByRole("button", { name: "Save habit" }));

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
    fireEvent.change(screen.getByPlaceholderText("HabitNamePlaceholder"), {
        target: { value: "My Habit" }
    });
    fireEvent.click(screen.getByRole("radio", { name: "Low" }));
    fireEvent.click(screen.getByRole("radio", { name: "Easy" }));
    fireEvent.click(screen.getByRole("radio", { name: "Beginner" }));
    const categoryChip = await screen.findByRole("checkbox", { name: /Health/i });
    fireEvent.click(categoryChip);

    // Picks the first icon in the compact selector (tiles with aria-label "Icon: …").
    const iconTiles = await screen.findAllByRole("button", { name: /^Icon:/i });
    fireEvent.click(iconTiles[0]);

    const submit = screen.getByRole("button", { name: "Save habit" });

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

/**
 * The page keeps its own list, but the store is what every routine row on the dashboard
 * and on the focus screen resolves names from. A save that refreshed only the page's list
 * left the persisted slice with the old name, and the focus screen kept showing it. The
 * refetch after a save must land in both.
 */
test("hands the list it refetches after a save to the shared store too", async () => {
    const saved = [{ id: "h-1", name: "My Habit", iconId: "icon", motivationalPhrase: "" }];
    mockCreateHabit.mockResolvedValueOnce({ success: "Habit created" });
    mockGetHabits.mockResolvedValue({ success: saved });
    const store = configureStore({ reducer: rootReducer });
    const setHabits = vi.fn();

    renderWithProviders(<HabitForm mode="create" setHabits={setHabits} />, { storeOverride: store });

    fireEvent.change(screen.getByPlaceholderText("HabitNamePlaceholder"), {
        target: { value: "My Habit" }
    });
    fireEvent.click(screen.getByRole("radio", { name: "Low" }));
    fireEvent.click(screen.getByRole("radio", { name: "Easy" }));
    fireEvent.click(screen.getByRole("radio", { name: "Beginner" }));
    fireEvent.click(await screen.findByRole("checkbox", { name: /Health/i }));
    const iconTiles = await screen.findAllByRole("button", { name: /^Icon:/i });
    fireEvent.click(iconTiles[0]);

    fireEvent.click(screen.getByRole("button", { name: "Save habit" }));

    await waitFor(() => expect(setHabits).toHaveBeenCalledWith(saved));
    expect(store.getState().habits.habits).toEqual(saved);
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
    fireEvent.change(screen.getByPlaceholderText("HabitNamePlaceholder"), {
        target: { value: "My Habit" }
    });

    // Select importance (click "Low" radio = value 1)
    fireEvent.click(screen.getByRole("radio", { name: "Low" }));

    // Select difficulty (click "Easy" radio = value 1)
    fireEvent.click(screen.getByRole("radio", { name: "Easy" }));

    // Select experience (segmented control, "Beginner" = value 0)
    fireEvent.click(screen.getByRole("radio", { name: "Beginner" }));

    // Wait for categories to load, then select the chip
    const categoryChip = await screen.findByRole("checkbox", { name: /Health/i });
    fireEvent.click(categoryChip);

    // Pick the first icon from the compact picker.
    const iconTiles = await screen.findAllByRole("button", { name: /^Icon:/i });
    fireEvent.click(iconTiles[0]);

    // Submit the form
    fireEvent.click(screen.getByRole("button", { name: "Save habit" }));

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
