import { screen, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, test, vi } from "vitest";
import rootReducer, { RootState } from "../redux/rootReducer";
import { renderWithProviders } from "../test/test-utils";
import Dashboard from "./dashboard/dashboard";
import Categories from "./categories/categories";
import Habits from "./habits/habits";
import Routine from "./routines/routine";
import Configuration from "./configuration/Configuration";
import { completeTutorial } from "../components/tutorial/flow/completeTutorial";

vi.mock("../components/configuration/WidgetsConfiguration", () => ({
    default: () => null
}));

vi.mock("../components/configuration/LanguageSelector", () => ({
    default: () => null
}));

vi.mock("../components/configuration/ProfileConfiguration", () => ({
    default: () => null
}));

vi.mock("../components/configuration/ConstanceConfiguration", () => ({
    default: () => null
}));

vi.mock("../components/configuration/ThemeSelector", () => ({
    default: () => null
}));

vi.mock("../components/configuration/TutorialConfiguration", () => ({
    default: () => null
}));

vi.mock("../components/header", () => ({
    default: () => null
}));

vi.mock("../components/useAuthGuard", () => ({
    default: () => null
}));

vi.mock("../components/tutorial/flow/completeTutorial", () => ({
    completeTutorial: vi.fn().mockResolvedValue(true)
}));

vi.mock("../services/user/editUser", () => ({
    default: vi.fn().mockResolvedValue({ data: {} })
}));

const buildStore = (overrides: Partial<RootState> = {}) => {
    const initial = rootReducer(undefined, { type: "init" }) as RootState;
    const preloadedState: RootState = {
        ...initial,
        ...overrides,
        perfil: { ...initial.perfil, ...overrides.perfil },
        categories: { ...initial.categories, ...overrides.categories },
        habits: { ...initial.habits, ...overrides.habits },
        routines: { ...initial.routines, ...overrides.routines },
        todayRoutine: { ...initial.todayRoutine, ...overrides.todayRoutine },
        editCategory: { ...initial.editCategory, ...overrides.editCategory },
        editHabit: { ...initial.editHabit, ...overrides.editHabit },
        editRoutine: { ...initial.editRoutine, ...overrides.editRoutine },
        viewFilters: { ...initial.viewFilters, ...overrides.viewFilters },
        tasks: { ...initial.tasks, ...overrides.tasks },
        goals: { ...initial.goals, ...overrides.goals }
    };
    return configureStore({ reducer: rootReducer, preloadedState });
};

describe("tutorial flow (core)", () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    test("dashboard shows onboarding on intro phase", async () => {
        window.localStorage.setItem("beyou.tutorial.phase", "intro");
        const store = buildStore();

        renderWithProviders(<Dashboard />, { storeOverride: store });

        expect(await screen.findByText("TutorialNext")).toBeInTheDocument();
    });

    test("categories shows spotlight on categories phase", async () => {
        window.localStorage.setItem("beyou.tutorial.phase", "categories");
        const store = buildStore();

        renderWithProviders(<Categories />, { storeOverride: store });

        expect(await screen.findByText("TutorialSpotlightCreateCategoryTitle")).toBeInTheDocument();
    });

    test("habits shows spotlight on habits phase", async () => {
        window.localStorage.setItem("beyou.tutorial.phase", "habits");
        const store = buildStore();

        renderWithProviders(<Habits />, { storeOverride: store });

        expect(await screen.findByText("TutorialSpotlightCreateHabitTitle")).toBeInTheDocument();
    });

    test("routines shows spotlight on routines phase", async () => {
        window.localStorage.setItem("beyou.tutorial.phase", "routines");
        const store = buildStore();

        renderWithProviders(<Routine />, { storeOverride: store });

        expect(await screen.findByText("TutorialSpotlightCreateRoutineTitle")).toBeInTheDocument();
    });

    test("configuration completes tutorial when phase is config", async () => {
        window.localStorage.setItem("beyou.tutorial.phase", "config");
        const store = buildStore();

        renderWithProviders(<Configuration />, { storeOverride: store });

        await waitFor(() => {
            expect(vi.mocked(completeTutorial)).toHaveBeenCalled();
        });
    });
});
