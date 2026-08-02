import { screen, act, fireEvent, within } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { vi, beforeEach } from "vitest";
import { renderWithProviders } from "../../test/test-utils";
import rootReducer, { RootState } from "@beyou/state/rootReducer";
import getGoals from "@beyou/api/goals/getGoals";
import { goal } from "@beyou/types/goals/goalType";

vi.mock("../../services/verifyAuthentication", () => ({
    default: vi.fn(() => Promise.resolve("success"))
}));

vi.mock("@beyou/api/goals/getGoals", () => ({ default: vi.fn() }));
vi.mock("@beyou/api/goals/deleteGoal", () => ({ default: vi.fn() }));
vi.mock("@beyou/api/goals/markGoalAsComplete", () => ({ default: vi.fn() }));
vi.mock("@beyou/api/goals/increaseCurrentValue", () => ({ default: vi.fn() }));
vi.mock("@beyou/api/goals/decreaseCurrentValue", () => ({ default: vi.fn() }));
vi.mock("../../hooks/useUiRefresh", () => ({ default: vi.fn() }));

const makeGoal = (overrides: Partial<goal>): goal => ({
    id: "goal-1",
    name: "Run 100 km",
    iconId: "lucide:footprints",
    description: "Only the logged runs",
    targetValue: 100,
    unit: "km",
    currentValue: 62,
    complete: false,
    categories: {},
    motivation: "",
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-12-31"),
    xpReward: 50,
    status: "IN_PROGRESS",
    term: "MEDIUM_TERM",
    ...overrides
});

const buildStore = (goals: goal[], editMode = false) => {
    const initial = rootReducer(undefined, { type: "init" }) as RootState;
    const preloadedState: RootState = {
        ...initial,
        goals: { ...initial.goals, goals },
        editGoal: { ...initial.editGoal, editMode }
    };
    return configureStore({ reducer: rootReducer, preloadedState });
};

beforeEach(() => {
    vi.mocked(getGoals).mockResolvedValue({ success: [] });
});

const renderGoalsPage = async (store: ReturnType<typeof buildStore>) => {
    const { default: Goals } = await import("./goals");
    let result!: ReturnType<typeof renderWithProviders>;
    await act(async () => {
        result = renderWithProviders(<Goals />, { storeOverride: store });
    });
    return result;
};

/**
 * The form no longer sits in a column next to the cards: the grid is full
 * width and creating/editing happens in a modal.
 */
test("shows the create button and no inline form", async () => {
    await renderGoalsPage(buildStore([]));

    expect(screen.getByTestId("create-goal")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("opens the Create Goal form in a modal", async () => {
    await renderGoalsPage(buildStore([]));

    await act(async () => {
        fireEvent.click(screen.getByTestId("create-goal"));
    });

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-labelledby", "goal-create-title");
    expect(within(dialog).getByRole("heading", { name: "Create Goal" })).toBeInTheDocument();
});

test("Edit on a card opens the modal on the edit form", async () => {
    const goals = [makeGoal({ id: "a", name: "Run 100 km" })];
    vi.mocked(getGoals).mockResolvedValue({ success: goals });
    await renderGoalsPage(buildStore(goals));

    await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    });

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-labelledby", "goal-edit-title");
    expect(within(dialog).getByRole("heading", { name: "Edit Goal" })).toBeInTheDocument();
});

test("status filter keeps completed goals reachable and hides them from the others", async () => {
    const goals = [
        makeGoal({ id: "a", name: "Run 100 km", status: "IN_PROGRESS" }),
        makeGoal({ id: "b", name: "Tidy the office", status: "COMPLETED", currentValue: 3, targetValue: 3 })
    ];
    vi.mocked(getGoals).mockResolvedValue({ success: goals });
    const { container } = await renderGoalsPage(buildStore(goals));

    expect(screen.getByText("Run 100 km")).toBeInTheDocument();
    expect(screen.getByText("Tidy the office")).toBeInTheDocument();

    // First select in the toolbar is the status filter.
    const statusSelect = container.querySelectorAll("select")[0];
    await act(async () => {
        fireEvent.change(statusSelect, { target: { value: "COMPLETED" } });
    });

    expect(screen.queryByText("Run 100 km")).not.toBeInTheDocument();
    expect(screen.getByText("Tidy the office")).toBeInTheDocument();
});
