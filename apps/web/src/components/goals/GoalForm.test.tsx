import { renderWithProviders } from "../../test/test-utils";
import GoalForm from "./GoalForm";
import { screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import store from "../../redux/store";
import { editStatusEnter } from "@beyou/state/goal/editGoalSlice";

vi.mock("@beyou/api/goals/createGoal", () => ({
    default: vi.fn().mockResolvedValue({})
}));

vi.mock("@beyou/api/goals/getGoals", () => ({
    default: vi.fn().mockResolvedValue({ success: [] })
}));


test("shows required errors for create goal", async () => {
    renderWithProviders(<GoalForm mode="create" />);

    fireEvent.click(screen.getByRole("button", { name: "Save goal" }));

    expect(await screen.findByText("YupNameRequired")).toBeInTheDocument();
    expect(await screen.findByText("YupIconRequired")).toBeInTheDocument();
});

test("create has no status field: a new goal always starts not started", () => {
    renderWithProviders(<GoalForm mode="create" />);

    expect(screen.queryByRole("radio", { name: "Not Started" })).toBeNull();
});

test("edit offers the two open statuses, so a wrong increment can be taken back", () => {
    store.dispatch(editStatusEnter("IN_PROGRESS"));
    renderWithProviders(<GoalForm mode="edit" />);

    expect(screen.getByRole("radio", { name: "Not Started" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: "In Progress" })).toBeEnabled();
    // Completing is the card's button, not a dropdown: that is where the XP moves.
    expect(screen.queryByRole("radio", { name: "Completed" })).toBeNull();
});

test("a completed goal shows the status locked, pointing at Undo", () => {
    store.dispatch(editStatusEnter("COMPLETED"));
    renderWithProviders(<GoalForm mode="edit" />);

    expect(screen.getByRole("radio", { name: "Completed" })).toBeDisabled();
    expect(screen.getByText("GoalStatusLockedByCompletion")).toBeInTheDocument();
});
