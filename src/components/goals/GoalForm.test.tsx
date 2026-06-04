import { renderWithProviders } from "../../test/test-utils";
import GoalForm from "./GoalForm";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("../../services/goals/createGoal", () => ({
    default: vi.fn().mockResolvedValue({})
}));

vi.mock("../../services/goals/getGoals", () => ({
    default: vi.fn().mockResolvedValue({ success: [] })
}));


test("shows required errors for create goal", async () => {
    renderWithProviders(<GoalForm mode="create" />);

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("YupNameRequired")).toBeInTheDocument();
    expect(await screen.findByText("YupIconRequired")).toBeInTheDocument();
});

test("create mode hides advanced fields until toggled", () => {
    renderWithProviders(<GoalForm mode="create" />);
    expect(screen.queryByTestId("goal-advanced-options")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("goal-advanced-toggle"));
    expect(screen.getByTestId("goal-advanced-options")).toBeInTheDocument();
});

test("auto-expands advanced panel when a hidden advanced field has an error", async () => {
    renderWithProviders(<GoalForm mode="create" />);

    // Open advanced options and clear the unit field
    // (In the test environment t() returns the key, so DefaultGoalUnit → "DefaultGoalUnit")
    fireEvent.click(screen.getByTestId("goal-advanced-toggle"));
    const unitInput = screen.getByDisplayValue("DefaultGoalUnit");
    fireEvent.change(unitInput, { target: { value: "" } });

    // Collapse the advanced panel
    fireEvent.click(screen.getByTestId("goal-advanced-toggle"));
    expect(screen.queryByTestId("goal-advanced-options")).not.toBeInTheDocument();

    // Submit — zod rejects the empty unit field
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    // Advanced panel should auto-expand revealing the unit error
    await waitFor(() => {
        expect(screen.getByTestId("goal-advanced-options")).toBeInTheDocument();
    });
    expect(await screen.findByText("YupUnitRequired")).toBeInTheDocument();
});
