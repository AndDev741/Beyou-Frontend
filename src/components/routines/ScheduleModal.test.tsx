import { renderWithProviders } from "../../test/test-utils";
import ScheduleModal from "./ScheduleModal";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "../../redux/rootReducer";
import { vi } from "vitest";

const createScheduleMock = vi.fn().mockResolvedValue({ success: true });

vi.mock("../../services/schedule/createSchedule", () => ({
    default: createScheduleMock
}));

vi.mock("../../services/schedule/editSchedule", () => ({
    default: vi.fn().mockResolvedValue({ success: true })
}));

vi.mock("../../services/routine/getRoutines", () => ({
    default: vi.fn().mockResolvedValue({ success: [] })
}));

const baseState = rootReducer(undefined as any, { type: "@@INIT" } as any);

test("calls createSchedule on save", async () => {
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
        expect(createScheduleMock).toHaveBeenCalled();
    });
});
