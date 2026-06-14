import { screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "@beyou/state/rootReducer";
import { renderWithProviders } from "../../../test/test-utils";
import RoutineCompleteSummary from "./RoutineCompleteSummary";

const baseState = rootReducer(undefined as any, { type: '@@INIT' } as any);

const buildStore = (checked: number, total: number, constance = 5, routine: any = null) =>
    configureStore({
        reducer: rootReducer,
        preloadedState: {
            ...baseState,
            perfil: {
                ...baseState.perfil,
                checkedItemsInScheduledRoutine: checked,
                totalItemsInScheduledRoutine: total,
                constance
            },
            todayRoutine: { routine }
        }
    });

test("hidden while routine is incomplete", () => {
    renderWithProviders(<RoutineCompleteSummary />, { storeOverride: buildStore(3, 7) });
    expect(screen.queryByTestId("routine-complete-summary")).not.toBeInTheDocument();
});

test("hidden when there is no routine today (total = 0)", () => {
    renderWithProviders(<RoutineCompleteSummary />, { storeOverride: buildStore(0, 0) });
    expect(screen.queryByTestId("routine-complete-summary")).not.toBeInTheDocument();
});

test("shows summary with XP when all items are checked", () => {
    const today = new Date().toJSON().slice(0, 10);
    const routine = {
        routineSections: [{
            habitGroup: [{ id: "hg-1", habitId: "h-1", habitGroupChecks: [{ id: "c1", checkDate: today, checked: true, xpGenerated: 30 }] }],
            taskGroup: []
        }]
    };
    renderWithProviders(<RoutineCompleteSummary />, { storeOverride: buildStore(1, 1, 5, routine) });
    expect(screen.getByTestId("routine-complete-summary")).toBeInTheDocument();
    expect(screen.getByText("RoutineCompleteTitle")).toBeInTheDocument();
});
