import { screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { vi } from "vitest";
import rootReducer, { RootState } from "../../redux/rootReducer";
import { renderWithProviders } from "../../test/test-utils";
import Dashboard from "./dashboard";

vi.mock("../../components/useAuthGuard", () => ({
    default: () => null
}));

vi.mock("../../components/tutorial/hooks/useDashboardTutorial", () => ({
    useDashboardTutorial: () => ({
        showIntroModal: false,
        showDashboardSpotlight: false,
        showHabitsDashboardSpotlight: false,
        showRoutinesDashboardSpotlight: false,
        showRoutineSummarySpotlight: false,
        showConfigDashboardSpotlight: false,
        dashboardSteps: [],
        habitsDashboardSteps: [],
        routinesDashboardSteps: [],
        routineSummarySteps: [],
        configDashboardSteps: [],
        startDashboardSpotlight: () => {},
        completeDashboardSpotlight: () => {},
        completeHabitsDashboardSpotlight: () => {},
        completeRoutinesDashboardSpotlight: () => {},
        completeRoutineSummarySpotlight: () => {},
        completeConfigDashboardSpotlight: () => {},
        completeTutorial: () => {}
    })
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

test("mobile widget board renders after today's routine", async () => {
    renderWithProviders(<Dashboard />, { storeOverride: buildStore() });
    const widgets = await screen.findByTestId("mobile-widget-board");
    const routine = document.querySelector('[data-tutorial-id="dashboard-routine-today"]')!;
    expect(routine).toBeTruthy();
    expect(routine.compareDocumentPosition(widgets) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
