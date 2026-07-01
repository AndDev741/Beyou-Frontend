import { renderHook, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import rootReducer from "@beyou/state/rootReducer";
import { useCategoriesTutorial } from "./useCategoriesTutorial";
import { useHabitsTutorial } from "./useHabitsTutorial";
import { getTutorialPhase } from "../tutorialStorage";

// The "open habits"/"open routines" shortcut spotlights only render on the
// dashboard, so finishing the categories/habits page walkthrough must both set
// the intermediate "-dashboard" phase AND navigate back to the dashboard.
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => ({
    ...(await importOriginal<typeof import("react-router-dom")>()),
    useNavigate: () => mockNavigate
}));

const makeWrapper = () => {
    const store = configureStore({ reducer: rootReducer });
    return ({ children }: { children: ReactNode }) => (
        <Provider store={store}>
            <MemoryRouter>{children}</MemoryRouter>
        </Provider>
    );
};

describe("tutorial page → dashboard hand-off", () => {
    beforeEach(() => {
        window.localStorage.clear();
        mockNavigate.mockClear();
    });

    it("categories onComplete returns to the dashboard for the habits step", () => {
        window.localStorage.setItem("beyou.tutorial.phase", "categories");
        const { result } = renderHook(() => useCategoriesTutorial({ hasCategories: true }), {
            wrapper: makeWrapper()
        });

        act(() => result.current.onComplete());

        expect(getTutorialPhase()).toBe("habits-dashboard");
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });

    it("habits onComplete returns to the dashboard for the routines step", () => {
        window.localStorage.setItem("beyou.tutorial.phase", "habits");
        const { result } = renderHook(() => useHabitsTutorial({ hasHabits: true }), {
            wrapper: makeWrapper()
        });

        act(() => result.current.onComplete());

        expect(getTutorialPhase()).toBe("routines-dashboard");
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
});
