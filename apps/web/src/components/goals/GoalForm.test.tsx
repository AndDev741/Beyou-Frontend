import { renderWithProviders } from "../../test/test-utils";
import GoalForm from "./GoalForm";
import { screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@beyou/api/goals/createGoal", () => ({
    default: vi.fn().mockResolvedValue({})
}));

vi.mock("@beyou/api/goals/getGoals", () => ({
    default: vi.fn().mockResolvedValue({ success: [] })
}));


test("shows required errors for create goal", async () => {
    renderWithProviders(<GoalForm mode="create" />);

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("YupNameRequired")).toBeInTheDocument();
    expect(await screen.findByText("YupIconRequired")).toBeInTheDocument();
});
