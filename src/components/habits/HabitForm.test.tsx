import { renderWithProviders } from "../../test/test-utils";
import HabitForm from "./HabitForm";
import { screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("../../services/habits/createHabit", () => ({
    default: vi.fn().mockResolvedValue({})
}));

vi.mock("../../services/habits/getHabits", () => ({
    default: vi.fn().mockResolvedValue({ success: [] })
}));

vi.mock("../../services/categories/getCategories", () => ({
    default: vi.fn().mockResolvedValue({ success: [] })
}));

test("shows required errors for create habit", async () => {
    renderWithProviders(<HabitForm mode="create" setHabits={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    expect(await screen.findByText("YupNameRequired")).toBeInTheDocument();
    expect(await screen.findByText("YupIconRequired")).toBeInTheDocument();
    expect(await screen.findByText("YupRequiredCategories")).toBeInTheDocument();
});
