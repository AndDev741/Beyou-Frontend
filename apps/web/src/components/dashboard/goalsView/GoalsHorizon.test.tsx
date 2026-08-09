import { screen, fireEvent } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "@beyou/state/rootReducer";
import { renderWithProviders } from "../../../test/test-utils";
import GoalsHorizon from "./GoalsHorizon";

const base = rootReducer(undefined as any, { type: "@@INIT" } as any);

const goal = (id: string, endDate: Date, current = 1, target = 10) => ({
    id,
    name: `Goal ${id}`,
    iconId: "",
    targetValue: target,
    unit: "km",
    currentValue: current,
    complete: false,
    categories: {},
    startDate: new Date(),
    endDate,
    xpReward: 40,
    status: "IN_PROGRESS",
    term: "SHORT",
});

const storeWith = (goals: unknown[]) =>
    configureStore({
        reducer: rootReducer,
        preloadedState: { ...base, goals: { ...base.goals, goals: goals as never } },
    });

const inDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
};

beforeEach(() => localStorage.clear());

test("groups goals by horizon and counts them on the filter chips", () => {
    renderWithProviders(<GoalsHorizon />, { storeOverride: storeWith([goal("a", inDays(1))]) });
    expect(screen.getByTestId("goals-horizon")).toBeInTheDocument();
    expect(screen.getByText("Goal a")).toBeInTheDocument();
});

test("hides a horizon when its chip is toggled off, and remembers the choice", () => {
    const store = storeWith([goal("a", inDays(1))]);
    const { unmount } = renderWithProviders(<GoalsHorizon />, { storeOverride: store });

    // Which horizon "tomorrow" falls into depends on the weekday, so the test turns
    // off whichever chip is on instead of pinning the label. The chips are the only
    // buttons with aria-pressed (the phone dropdown uses aria-expanded).
    fireEvent.click(screen.getAllByRole("button", { pressed: true })[0]);
    expect(screen.queryByText("Goal a")).not.toBeInTheDocument();

    // The choice survives a remount: someone watching only the week does not refilter daily.
    unmount();
    renderWithProviders(<GoalsHorizon />, { storeOverride: store });
    expect(screen.queryByText("Goal a")).not.toBeInTheDocument();
});

test("renders nothing at all when the user has no goals", () => {
    renderWithProviders(<GoalsHorizon />, { storeOverride: storeWith([]) });
    expect(screen.queryByTestId("goals-horizon")).not.toBeInTheDocument();
});

test("marks a goal that reached its target so it stands out from the rest", () => {
    renderWithProviders(<GoalsHorizon />, {
        storeOverride: storeWith([goal("done", inDays(1), 10, 10)]),
    });
    // The promised XP only shows once the target has been hit.
    expect(screen.getByText("+40")).toBeInTheDocument();
});

/**
 * `[]` persisted means "hide them all", and it has to survive a remount. It used
 * to collapse into `null` — indistinguishable from "never chose" — so the three
 * defaults came back and undid the choice.
 */
test("a stored empty selection keeps every horizon hidden", () => {
    localStorage.setItem("beyou-goal-horizons", JSON.stringify([]));
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() + 1);

    renderWithProviders(<GoalsHorizon />, { storeOverride: storeWith([goal("a", thisWeek)]) });

    expect(screen.queryByText("Goal a")).not.toBeInTheDocument();
    localStorage.removeItem("beyou-goal-horizons");
});
