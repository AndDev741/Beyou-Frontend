import { screen, fireEvent, act } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, test, vi } from "vitest";
import rootReducer, { type RootState } from "@beyou/state/rootReducer";
import type { goal } from "@beyou/types/goals/goalType";
import { useLocation, useNavigationType } from "react-router-dom";
import { renderWithProviders } from "../../test/test-utils";

vi.mock("@beyou/api/goals/getGoals", () => ({ default: vi.fn().mockResolvedValue({ success: [] }) }));
vi.mock("@beyou/api/goals/markGoalAsComplete", () => ({ default: vi.fn() }));
vi.mock("@beyou/api/goals/increaseCurrentValue", () => ({ default: vi.fn() }));
vi.mock("@beyou/api/goals/decreaseCurrentValue", () => ({ default: vi.fn() }));
vi.mock("../../hooks/useUiRefresh", () => ({ default: vi.fn() }));
vi.mock("../../components/useAuthGuard", () => ({ default: () => {} }));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
    return { ...actual, useNavigate: () => mockNavigate };
});

import GoalViewer from "./GoalViewer";

/** What the router holds: the search string and whether the last move pushed or replaced. */
function LocationProbe() {
    const { search } = useLocation();
    const type = useNavigationType();
    return <span data-testid="location-probe">{`${type} ${search}`}</span>;
}

const makeGoal = (over: Partial<goal>): goal => ({
    id: "g",
    name: "Goal",
    iconId: "lucide:book",
    description: "",
    targetValue: 10,
    unit: "km",
    currentValue: 2,
    complete: false,
    categories: {},
    motivation: "Because it matters",
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-12-31"),
    xpReward: 50,
    status: "NOT_STARTED",
    term: "SHORT_TERM",
    parentId: null,
    ...over,
});

// One of each status, in an order that only "by status" would put in-progress first.
const goals = [
    makeGoal({ id: "done", name: "Done goal", status: "COMPLETED", complete: true, currentValue: 10 }),
    makeGoal({ id: "fresh", name: "Fresh goal", status: "NOT_STARTED" }),
    makeGoal({ id: "active", name: "Active goal", status: "IN_PROGRESS", currentValue: 5 }),
];

const buildStore = (list: goal[] = goals, layout?: string) => {
    const initial = rootReducer(undefined, { type: "init" }) as RootState;
    return configureStore({
        reducer: rootReducer,
        preloadedState: {
            ...initial,
            goals: { ...initial.goals, goals: list },
            viewFilters: { ...initial.viewFilters, ...(layout ? { goalsViewerLayout: layout } : {}) },
        },
    });
};

// A main goal, its sub-goal, that one's own sub-goal, and an unrelated main goal.
const tree = [
    makeGoal({ id: "big", name: "Marathon", status: "IN_PROGRESS" }),
    makeGoal({ id: "mid", name: "Run 10k", status: "IN_PROGRESS", currentValue: 3, parentId: "big" }),
    makeGoal({ id: "leaf", name: "Run 5k", status: "NOT_STARTED", parentId: "mid" }),
    makeGoal({ id: "other", name: "Other", status: "NOT_STARTED" }),
];

beforeEach(() => {
    vi.clearAllMocks();
});

describe("GoalViewer", () => {
    test("opens on the first goal by status: in progress before not started before done", () => {
        renderWithProviders(<GoalViewer />, { storeOverride: buildStore(), route: "/goals/view" });

        expect(screen.getByTestId("goal-viewer-slide")).toHaveAttribute("data-goal-id", "active");
        expect(screen.getByRole("heading", { level: 2, name: "Active goal" })).toBeInTheDocument();
        expect(screen.getByText("Because it matters")).toBeInTheDocument();
        expect(screen.getByTestId("goal-viewer-position")).toHaveTextContent("GoalViewerPosition");
    });

    test("Next walks the deck, and Previous walks it back", () => {
        renderWithProviders(<GoalViewer />, { storeOverride: buildStore(), route: "/goals/view" });

        fireEvent.click(screen.getByTestId("goal-viewer-next"));
        expect(screen.getByTestId("goal-viewer-slide")).toHaveAttribute("data-goal-id", "fresh");
        fireEvent.click(screen.getByTestId("goal-viewer-next"));
        expect(screen.getByTestId("goal-viewer-slide")).toHaveAttribute("data-goal-id", "done");
        // The last slide: nowhere further to go.
        expect(screen.getByTestId("goal-viewer-next")).toBeDisabled();
        fireEvent.click(screen.getByTestId("goal-viewer-prev"));
        expect(screen.getByTestId("goal-viewer-slide")).toHaveAttribute("data-goal-id", "fresh");
    });

    test("?goal=<id> opens on that goal", () => {
        renderWithProviders(<GoalViewer />, { storeOverride: buildStore(), route: "/goals/view?goal=done" });

        expect(screen.getByTestId("goal-viewer-slide")).toHaveAttribute("data-goal-id", "done");
        expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
    });

    test("Escape and the X leave for the goals page", async () => {
        renderWithProviders(<GoalViewer />, { storeOverride: buildStore(), route: "/goals/view" });

        await act(async () => {
            fireEvent.keyDown(window, { key: "Escape" });
        });
        expect(mockNavigate).toHaveBeenCalledWith("/goals");

        fireEvent.click(screen.getByTestId("goal-viewer-leave"));
        expect(mockNavigate).toHaveBeenCalledTimes(2);
    });

    test("the status filter narrows the deck and clamps the index", () => {
        renderWithProviders(<GoalViewer />, { storeOverride: buildStore(), route: "/goals/view?goal=done" });

        fireEvent.change(screen.getByTestId("goal-viewer-status"), { target: { value: "IN_PROGRESS" } });
        expect(screen.getByTestId("goal-viewer-slide")).toHaveAttribute("data-goal-id", "active");
        expect(screen.getByTestId("goal-viewer-next")).toBeDisabled();
    });

    test("a sub-goal slide links back to its main goal (list layout)", () => {
        const store = buildStore(tree.slice(0, 2), "list");
        renderWithProviders(<GoalViewer />, { storeOverride: store, route: "/goals/view?goal=mid" });

        expect(screen.getByTestId("goal-viewer-parent")).toHaveTextContent("Marathon");
        fireEvent.click(screen.getByTestId("goal-viewer-parent"));
        expect(screen.getByTestId("goal-viewer-slide")).toHaveAttribute("data-goal-id", "big");
        // And the main goal lists the sub-goal, which jumps back down.
        fireEvent.click(screen.getByTestId("goal-viewer-subgoal-mid"));
        expect(screen.getByTestId("goal-viewer-slide")).toHaveAttribute("data-goal-id", "mid");
    });

    test("tapping into a sub-goal pushes a history entry, walking with the arrows does not", () => {
        // The point: the browser's back button after opening a sub-goal returns to the main
        // goal, not to the goals page. That only holds if the jump is a PUSH and the arrows
        // are REPLACEs, otherwise back would either skip the parent or leave the viewer.
        const store = buildStore(tree, "list");
        renderWithProviders(
            <>
                <GoalViewer />
                <LocationProbe />
            </>,
            { storeOverride: store, route: "/goals/view?goal=big" },
        );

        fireEvent.click(screen.getByTestId("goal-viewer-subgoal-mid"));
        expect(screen.getByTestId("goal-viewer-slide")).toHaveAttribute("data-goal-id", "mid");
        expect(screen.getByTestId("location-probe")).toHaveTextContent("PUSH ?goal=mid");

        fireEvent.click(screen.getByTestId("goal-viewer-next"));
        expect(screen.getByTestId("goal-viewer-slide")).toHaveAttribute("data-goal-id", "leaf");
        expect(screen.getByTestId("location-probe")).toHaveTextContent("REPLACE ?goal=leaf");
    });

    describe("grouped layout (the default)", () => {
        test("the deck holds the main goals only and the position counts them", () => {
            renderWithProviders(<GoalViewer />, { storeOverride: buildStore(tree), route: "/goals/view" });

            expect(screen.getByTestId("goal-viewer-layout")).toHaveValue("grouped");
            expect(screen.getByTestId("goal-viewer-slide")).toHaveAttribute("data-goal-id", "big");
            // Two roots: the position says 1 of 2, and Next lands on the other root, not the sub-goal.
            expect(screen.getByTestId("goal-viewer-position")).toHaveAttribute("data-position", "1/2");
            fireEvent.click(screen.getByTestId("goal-viewer-next"));
            expect(screen.getByTestId("goal-viewer-slide")).toHaveAttribute("data-goal-id", "other");
            expect(screen.getByTestId("goal-viewer-next")).toBeDisabled();
        });

        test("tapping a sub-goal opens its full slide on top of the parent's position", () => {
            renderWithProviders(
                <>
                    <GoalViewer />
                    <LocationProbe />
                </>,
                { storeOverride: buildStore(tree), route: "/goals/view?goal=big" },
            );

            fireEvent.click(screen.getByTestId("goal-viewer-subgoal-mid"));
            expect(screen.getByTestId("goal-viewer-slide")).toHaveAttribute("data-goal-id", "mid");
            expect(screen.getByRole("heading", { level: 2, name: "Run 10k" })).toBeInTheDocument();
            expect(screen.getByTestId("goal-viewer-counter")).toHaveTextContent("3/10 km");
            expect(screen.getByRole("button", { name: "Increase" })).toBeEnabled();
            // The deck did not move: the sub-goal is shown, the parent's slide is still current.
            expect(screen.getByTestId("goal-viewer-position")).toHaveAttribute("data-position", "1/2");
            // Opening is a PUSH so the browser's back returns to the parent.
            expect(screen.getByTestId("location-probe")).toHaveTextContent("PUSH ?goal=mid");
            // The sub-goal's own sub-goal opens from here as well.
            fireEvent.click(screen.getByTestId("goal-viewer-subgoal-leaf"));
            expect(screen.getByTestId("goal-viewer-slide")).toHaveAttribute("data-goal-id", "leaf");
            expect(screen.getByTestId("goal-viewer-position")).toHaveAttribute("data-position", "1/2");
        });

        test("the parent control returns to the parent slide", () => {
            renderWithProviders(<GoalViewer />, { storeOverride: buildStore(tree), route: "/goals/view?goal=leaf" });

            expect(screen.getByTestId("goal-viewer-slide")).toHaveAttribute("data-goal-id", "leaf");
            const parent = screen.getByTestId("goal-viewer-parent");
            expect(parent).toHaveTextContent("Run 10k");
            expect(parent).toBeEnabled();
            fireEvent.click(parent);
            expect(screen.getByTestId("goal-viewer-slide")).toHaveAttribute("data-goal-id", "mid");
            fireEvent.click(screen.getByTestId("goal-viewer-parent"));
            expect(screen.getByTestId("goal-viewer-slide")).toHaveAttribute("data-goal-id", "big");
            expect(screen.queryByTestId("goal-viewer-parent")).not.toBeInTheDocument();
        });

        test("Next from an opened sub-goal moves the deck and closes the drill-in", () => {
            renderWithProviders(<GoalViewer />, { storeOverride: buildStore(tree), route: "/goals/view?goal=mid" });

            expect(screen.getByTestId("goal-viewer-slide")).toHaveAttribute("data-goal-id", "mid");
            fireEvent.click(screen.getByTestId("goal-viewer-next"));
            expect(screen.getByTestId("goal-viewer-slide")).toHaveAttribute("data-goal-id", "other");
            expect(screen.getByTestId("goal-viewer-position")).toHaveAttribute("data-position", "2/2");
        });

        test("switching to the list layout gives the sub-goal a slide of its own", () => {
            const store = buildStore(tree);
            renderWithProviders(<GoalViewer />, { storeOverride: store, route: "/goals/view?goal=mid" });
            expect(screen.getByTestId("goal-viewer-position")).toHaveAttribute("data-position", "1/2");

            fireEvent.change(screen.getByTestId("goal-viewer-layout"), { target: { value: "list" } });

            expect(store.getState().viewFilters.goalsViewerLayout).toBe("list");
            expect(screen.getByTestId("goal-viewer-slide")).toHaveAttribute("data-goal-id", "mid");
            // In-progress first, then by deadline: big, mid, then the two not-started ones.
            expect(screen.getByTestId("goal-viewer-position")).toHaveAttribute("data-position", "2/4");
        });

        test("the layout choice is the shared viewFilters preference", () => {
            const store = buildStore(tree);
            const dispatch = vi.spyOn(store, "dispatch");
            renderWithProviders(<GoalViewer />, { storeOverride: store, route: "/goals/view" });

            fireEvent.change(screen.getByTestId("goal-viewer-layout"), { target: { value: "list" } });
            expect(dispatch).toHaveBeenCalledWith(
                expect.objectContaining({ type: "viewFilters/setViewSort", payload: { view: "goalsViewerLayout", sortBy: "list" } }),
            );
            expect(screen.getByTestId("goal-viewer-layout")).toHaveValue("list");
        });
    });
});
