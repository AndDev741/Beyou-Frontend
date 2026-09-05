import { renderWithProviders } from "../../test/test-utils";
import GoalForm from "./GoalForm";
import { screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import store from "../../redux/store";
import { editStatusEnter, editGoalIdEnter, editParentIdEnter } from "@beyou/state/goal/editGoalSlice";
import { enterGoals } from "@beyou/state/goal/goalsSlice";

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

test("the parent picker never offers the goal being edited, and starts on its current parent", () => {
    const g = (id: string, name: string, parentId: string | null) => ({
        id, name, iconId: "i", targetValue: 10, unit: "u", currentValue: 0, complete: false,
        categories: {}, startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"),
        xpReward: 0, status: "NOT_STARTED", term: "SHORT_TERM", parentId,
    });
    store.dispatch(enterGoals([g("big", "Marathon", null), g("mid", "Run 10k", "big"), g("other", "Read", null)]));
    store.dispatch(editGoalIdEnter("mid"));
    store.dispatch(editParentIdEnter("big"));
    store.dispatch(editStatusEnter("IN_PROGRESS"));
    renderWithProviders(<GoalForm mode="edit" />);

    const picker = screen.getByTestId("goal-parent") as HTMLSelectElement;
    const labels = Array.from(picker.options).map((o) => o.textContent);
    expect(labels).toContain("ParentGoalNone");
    expect(labels).toContain("Marathon");
    expect(labels).toContain("Read");
    expect(labels).not.toContain("Run 10k");
    expect(picker.value).toBe("big");
});

test("Add sub-goal opens the create form with the parent chosen and its categories borrowed", () => {
    store.dispatch(enterGoals([{
        id: "big", name: "Marathon", iconId: "i", targetValue: 42, unit: "km", currentValue: 0, complete: false,
        categories: { cat1: { name: "Health", iconId: "i" } }, startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"), xpReward: 0, status: "NOT_STARTED", term: "LONG_TERM", parentId: null,
    }]));
    renderWithProviders(<GoalForm mode="create" defaultParentId="big" />);

    expect((screen.getByTestId("goal-parent") as HTMLSelectElement).value).toBe("big");
    expect(screen.getByText("ParentGoalHint")).toBeInTheDocument();
});
