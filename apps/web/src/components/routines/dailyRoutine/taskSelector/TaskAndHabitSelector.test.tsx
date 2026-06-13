import { renderWithProviders } from "../../../../test/test-utils";
import { screen, fireEvent } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { vi } from "vitest";
import rootReducer from "../../../../redux/rootReducer";
import TaskAndHabitSelector from "./TaskAndHabitSelector";

vi.mock("./QuickCreateHabitModal", () => ({
    default: ({ isOpen, onCreated }: { isOpen: boolean; onCreated?: (id?: string) => void }) =>
        isOpen ? (
            <button type="button" onClick={() => onCreated?.("h1")}>mock create habit</button>
        ) : null
}));

vi.mock("./QuickCreateTaskModal", () => ({
    default: ({ isOpen, onCreated }: { isOpen: boolean; onCreated?: (id?: string) => void }) =>
        isOpen ? (
            <button type="button" onClick={() => onCreated?.("t1")}>mock create task</button>
        ) : null
}));

vi.mock("react-toastify", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn()
    }
}));

const baseState = rootReducer(undefined as any, { type: "@@INIT" } as any);

test("auto-adds created habit to section when time is set", () => {
    let sections = [
        {
            id: "section-1",
            name: "Morning",
            iconId: "icon",
            startTime: "08:00",
            endTime: "09:00",
            habitGroup: [],
            taskGroup: [],
            order: 0
        }
    ];

    const setRoutineSection = (updater: any) => {
        sections = typeof updater === "function" ? updater(sections) : updater;
    };

    const storeOverride = configureStore({
        reducer: rootReducer,
        preloadedState: {
            ...baseState,
            habits: { ...baseState.habits, habits: [] },
            tasks: { ...baseState.tasks, tasks: [] }
        }
    });

    const { container } = renderWithProviders(
        <TaskAndHabitSelector
            setRoutineSection={setRoutineSection}
            index={0}
            section={sections[0]}
            setOpenTaskSelector={vi.fn()}
        />,
        { storeOverride }
    );

    const timeInputs = container.querySelectorAll('input[type="time"]');
    fireEvent.change(timeInputs[0], { target: { value: "08:10" } });
    fireEvent.change(timeInputs[1], { target: { value: "08:20" } });

    fireEvent.click(screen.getByText(/New Habit|NewHabit/i));
    fireEvent.click(screen.getByText("mock create habit"));

    expect(sections[0].habitGroup).toHaveLength(1);
    expect(sections[0].habitGroup[0]).toEqual(
        expect.objectContaining({ habitId: "h1", startTime: "08:10", endTime: "08:20" })
    );
});

test("auto-adds created task to section when time is set", () => {
    let sections = [
        {
            id: "section-1",
            name: "Morning",
            iconId: "icon",
            startTime: "08:00",
            endTime: "09:00",
            habitGroup: [],
            taskGroup: [],
            order: 0
        }
    ];

    const setRoutineSection = (updater: any) => {
        sections = typeof updater === "function" ? updater(sections) : updater;
    };

    const storeOverride = configureStore({
        reducer: rootReducer,
        preloadedState: {
            ...baseState,
            habits: { ...baseState.habits, habits: [] },
            tasks: { ...baseState.tasks, tasks: [] }
        }
    });

    const { container } = renderWithProviders(
        <TaskAndHabitSelector
            setRoutineSection={setRoutineSection}
            index={0}
            section={sections[0]}
            setOpenTaskSelector={vi.fn()}
        />,
        { storeOverride }
    );

    const timeInputs = container.querySelectorAll('input[type="time"]');
    fireEvent.change(timeInputs[0], { target: { value: "08:10" } });
    fireEvent.change(timeInputs[1], { target: { value: "08:20" } });

    fireEvent.click(screen.getByText(/New Task|NewTask/i));
    fireEvent.click(screen.getByText("mock create task"));

    expect(sections[0].taskGroup).toHaveLength(1);
    expect(sections[0].taskGroup[0]).toEqual(
        expect.objectContaining({ taskId: "t1", startTime: "08:10", endTime: "08:20" })
    );
});
