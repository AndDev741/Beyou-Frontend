import { screen, fireEvent, act } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, test, vi } from "vitest";
import rootReducer, { type RootState } from "@beyou/state/rootReducer";
import type { goal } from "@beyou/types/goals/goalType";
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

const buildStore = () => {
    const initial = rootReducer(undefined, { type: "init" }) as RootState;
    return configureStore({
        reducer: rootReducer,
        preloadedState: { ...initial, goals: { ...initial.goals, goals } },
    });
};

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

    test("a sub-goal slide links back to its main goal", () => {
        const initial = rootReducer(undefined, { type: "init" }) as RootState;
        const tree = [
            makeGoal({ id: "big", name: "Marathon", status: "IN_PROGRESS" }),
            makeGoal({ id: "mid", name: "Run 10k", status: "IN_PROGRESS", parentId: "big" }),
        ];
        const store = configureStore({
            reducer: rootReducer,
            preloadedState: { ...initial, goals: { ...initial.goals, goals: tree } },
        });
        renderWithProviders(<GoalViewer />, { storeOverride: store, route: "/goals/view?goal=mid" });

        expect(screen.getByTestId("goal-viewer-parent")).toHaveTextContent("Marathon");
        fireEvent.click(screen.getByTestId("goal-viewer-parent"));
        expect(screen.getByTestId("goal-viewer-slide")).toHaveAttribute("data-goal-id", "big");
        // And the main goal lists the sub-goal, which jumps back down.
        fireEvent.click(screen.getByTestId("goal-viewer-subgoal-mid"));
        expect(screen.getByTestId("goal-viewer-slide")).toHaveAttribute("data-goal-id", "mid");
    });
});
