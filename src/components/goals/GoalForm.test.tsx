import { renderWithProviders } from "../../test/test-utils";
import GoalForm from "./GoalForm";
import { screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("../../services/goals/createGoal", () => ({
    default: vi.fn().mockResolvedValue({})
}));

vi.mock("../../services/goals/getGoals", () => ({
    default: vi.fn().mockResolvedValue({ success: [] })
}));

vi.mock("../../services/categories/getCategories", () => ({
    default: vi.fn().mockResolvedValue({ success: [] })
}));

test("shows required errors for create goal", async () => {
    renderWithProviders(<GoalForm mode="create" />);

    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    expect(await screen.findByText("YupNameRequired")).toBeInTheDocument();
    expect(await screen.findByText("YupIconRequired")).toBeInTheDocument();
});
