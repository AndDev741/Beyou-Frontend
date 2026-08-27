import { renderWithProviders } from "../../../test/test-utils";
import CreateListRoutine from "./CreateListRoutine";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "@beyou/state/rootReducer";
import { vi } from "vitest";
import createRoutine from "@beyou/api/routine/createRoutine";

vi.mock("@beyou/api/routine/createRoutine", () => ({
    default: vi.fn().mockResolvedValue({})
}));

vi.mock("@beyou/api/routine/getRoutines", () => ({
    default: vi.fn().mockResolvedValue({ success: [] })
}));

const baseState = rootReducer(undefined as never, { type: "@@INIT" } as never);

const storeWithItems = () =>
    configureStore({
        reducer: rootReducer,
        preloadedState: {
            ...baseState,
            habits: { ...baseState.habits, habits: [{ id: "h1", name: "Meditate", iconId: "" }] },
            tasks: { ...baseState.tasks, tasks: [{ id: "t1", name: "Buy groceries", iconId: "" }] },
        } as never,
    });

test("refuses to save a list with no items", async () => {
    renderWithProviders(
        <CreateListRoutine routineType="list" setRoutineType={() => {}} />,
        { storeOverride: storeWithItems() },
    );

    fireEvent.click(screen.getByRole("button", { name: /save routine/i }));

    expect(await screen.findByText("YupNameRequired")).toBeInTheDocument();
    expect(await screen.findByText("AtLeastOneItemRequired")).toBeInTheDocument();
    expect(createRoutine).not.toHaveBeenCalled();
});

test("sends a flat item list, in the order picked, and no sections", async () => {
    renderWithProviders(
        <CreateListRoutine routineType="list" setRoutineType={() => {}} />,
        { storeOverride: storeWithItems() },
    );

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Errands" } });

    fireEvent.click(screen.getByRole("button", { name: "AddHabitOrTask" }));
    fireEvent.click(await screen.findByLabelText("Meditate"));
    fireEvent.click(screen.getByRole("button", { name: /^Add 1$/ }));

    fireEvent.click(screen.getByRole("button", { name: /save routine/i }));

    await waitFor(() => expect(createRoutine).toHaveBeenCalled());
    const [routine] = (createRoutine as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(routine.name).toBe("Errands");
    expect(routine.type).toBe("LIST");
    // A list carries no sections: the server builds the one it stores the items in, and a
    // request sending both shapes is rejected outright rather than half-applied.
    expect(routine.routineSections).toEqual([]);
    expect(routine.items).toHaveLength(1);
    expect(routine.items[0]).toEqual(expect.objectContaining({ type: "HABIT", habitId: "h1", orderIndex: 0 }));
});
