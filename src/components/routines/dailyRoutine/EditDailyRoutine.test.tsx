import { renderWithProviders } from "../../../test/test-utils";
import EditDailyRoutine from "./EditDailyRoutine";
import { screen, fireEvent } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "../../../redux/rootReducer";
import { vi } from "vitest";

vi.mock("../../../services/routine/editRoutine", () => ({
    default: vi.fn().mockResolvedValue({})
}));

vi.mock("../../../services/routine/getRoutines", () => ({
    default: vi.fn().mockResolvedValue({ success: [] })
}));

const baseState = rootReducer(undefined as any, { type: "@@INIT" } as any);

test("shows validation errors for missing name and sections", async () => {
    const storeOverride = configureStore({
        reducer: rootReducer,
        preloadedState: {
            ...baseState,
            editRoutine: {
                ...baseState.editRoutine,
                routine: {
                    id: "r1",
                    name: "",
                    iconId: "",
                    routineSections: []
                }
            },
            routines: {
                ...baseState.routines,
                routines: []
            }
        }
    });

    renderWithProviders(<EditDailyRoutine />, { storeOverride });

    fireEvent.click(screen.getByRole("button", { name: /Edit/i }));

    expect(await screen.findByText("YupNameRequired")).toBeInTheDocument();
    expect(await screen.findByText("At least, 1 section need to be created")).toBeInTheDocument();
});
