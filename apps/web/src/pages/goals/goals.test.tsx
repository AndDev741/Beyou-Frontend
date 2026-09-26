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

test("archived goals leave the page and come back under the Archived view", async () => {
    const active = makeGoal({ id: "run", name: "Run 100 km" });
    const archived = makeGoal({ id: "uke", name: "Learn the ukulele", archivedAt: "2026-09-20T08:00:00Z" });
    vi.mocked(getGoals).mockResolvedValue({ success: [active, archived] });
    await renderGoalsPage(buildStore([active, archived]));

    expect(screen.getByText("Run 100 km")).toBeInTheDocument();
    expect(screen.queryByText("Learn the ukulele")).not.toBeInTheDocument();

    await act(async () => {
        fireEvent.change(screen.getByLabelText("Status"), { target: { value: "ARCHIVED" } });
    });

    expect(screen.getByText("Learn the ukulele")).toBeInTheDocument();
    expect(screen.queryByText("Run 100 km")).not.toBeInTheDocument();
    expect(screen.getByTestId("restore-goal-inline-uke")).toBeInTheDocument();
});

test("the Archived view explains itself when nothing is archived yet", async () => {
    // The option only appears once something is archived; reached with nothing left (the last
    // one just restored), the page says what the archive is for instead of "no results".
    const archived = makeGoal({ id: "uke", name: "Learn the ukulele", archivedAt: "2026-09-20T08:00:00Z" });
    vi.mocked(getGoals).mockResolvedValue({ success: [archived] });
    const store = buildStore([archived]);
    await renderGoalsPage(store);
    await act(async () => {
        fireEvent.change(screen.getByLabelText("Status"), { target: { value: "ARCHIVED" } });
    });
    await act(async () => {
        store.dispatch({ type: "goals/updateGoal", payload: { ...archived, archivedAt: null } });
    });

    expect(screen.getByText("ArchivedGoalsEmptyTitle")).toBeInTheDocument();
});
