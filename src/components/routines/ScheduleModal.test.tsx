import { renderWithProviders } from "../../test/test-utils";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "../../redux/rootReducer";
import { vi } from "vitest";
import createSchedule from "../../services/schedule/createSchedule";

vi.mock("../../services/schedule/createSchedule", () => ({
    default: vi.fn().mockResolvedValue({ success: true })
}));

vi.mock("../../services/schedule/editSchedule", () => ({
    default: vi.fn().mockResolvedValue({ success: true })
}));

vi.mock("../../services/routine/getRoutines", () => ({
    default: vi.fn().mockResolvedValue({ success: [] })
}));

const baseState = rootReducer(undefined as any, { type: "@@INIT" } as any);

test("calls createSchedule on save", async () => {
    const { default: ScheduleModal } = await import("./ScheduleModal");
    const routine = {
        id: "r1",
        name: "Routine",
        iconId: "",
        routineSections: []
    };

    const storeOverride = configureStore({
        reducer: rootReducer,
        preloadedState: {
            ...baseState,
            routines: {
                ...baseState.routines,
                routines: [routine]
            }
        }
    });

    renderWithProviders(<ScheduleModal routine={routine} onClose={() => {}} />, { storeOverride });

    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
        expect(vi.mocked(createSchedule)).toHaveBeenCalled();
    });
});
