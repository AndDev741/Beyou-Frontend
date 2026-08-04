import { renderWithProviders } from "../../../../test/test-utils";
import { screen, fireEvent } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { vi } from "vitest";
import rootReducer from "@beyou/state/rootReducer";
import TaskAndHabitSelector, { suggestSlots } from "./TaskAndHabitSelector";
import { RoutineSection } from "@beyou/types/routine/routineSection";

vi.mock("./QuickCreateHabitModal", () => ({
    default: ({ isOpen, onCreated }: { isOpen: boolean; onCreated?: (id?: string) => void }) =>
        isOpen ? (
            <button type="button" onClick={() => onCreated?.("h9")}>mock create habit</button>
        ) : null
}));

vi.mock("./QuickCreateTaskModal", () => ({
    default: ({ isOpen, onCreated }: { isOpen: boolean; onCreated?: (id?: string) => void }) =>
        isOpen ? (
            <button type="button" onClick={() => onCreated?.("t9")}>mock create task</button>
        ) : null
}));

const baseState = rootReducer(undefined as any, { type: "@@INIT" } as any);

const buildSection = (): RoutineSection => ({
    id: "section-1",
    name: "Morning",
    iconId: "icon",
    startTime: "08:00",
    endTime: "09:00",
    habitGroup: [],
    taskGroup: [],
    order: 0
});

const habitFixtures = [
    { id: "h1", name: "Drink water", iconId: "", categories: [{ name: "Health" }] },
    { id: "h2", name: "Stretch", iconId: "", categories: [] },
    { id: "h3", name: "Read", iconId: "", categories: [] }
];

function setup(section: RoutineSection) {
    let sections = [section];
    const setRoutineSection = (updater: any) => {
        sections = typeof updater === "function" ? updater(sections) : updater;
    };

    const storeOverride = configureStore({
        reducer: rootReducer,
        preloadedState: {
            ...baseState,
            habits: { ...baseState.habits, habits: habitFixtures as any },
            tasks: { ...baseState.tasks, tasks: [{ id: "t1", name: "Pay bills", iconId: "" }] as any }
        }
    });

    renderWithProviders(
        <TaskAndHabitSelector
            setRoutineSection={setRoutineSection}
            index={0}
            section={section}
            setOpenTaskSelector={vi.fn()}
        />,
        { storeOverride }
    );

    return () => sections;
}

test("adds every selected habit at once, with times suggested in sequence", () => {
    const read = setup(buildSection());

    fireEvent.click(screen.getByRole("checkbox", { name: /drink water/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /stretch/i }));

    // O botão conta a seleção.
    fireEvent.click(screen.getByRole("button", { name: "Add 2" }));

    expect(read()[0].habitGroup).toEqual([
        expect.objectContaining({ habitId: "h1", startTime: "08:00", endTime: "08:30" }),
        expect.objectContaining({ habitId: "h2", startTime: "08:30", endTime: "09:00" })
    ]);
});

test("what is already in the section cannot be picked twice", () => {
    const section = buildSection();
    section.habitGroup = [{ habitId: "h1", startTime: "08:00", endTime: "08:10" } as any];
    setup(section);

    expect(screen.getByRole("checkbox", { name: /drink water/i })).toBeDisabled();
    // O i18n de teste devolve a chave crua, sem interpolar o nome da seção.
    expect(screen.getByText("AlreadyInSection")).toBeInTheDocument();
});

test("search narrows the list", () => {
    setup(buildSection());

    fireEvent.change(screen.getByLabelText("SearchHabitOrTask"), { target: { value: "read" } });

    expect(screen.getByRole("checkbox", { name: /read/i })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /stretch/i })).not.toBeInTheDocument();
});

test("a quick-created habit goes straight into the section", () => {
    const read = setup(buildSection());

    fireEvent.click(screen.getByRole("button", { name: "NewHabit" }));
    fireEvent.click(screen.getByText("mock create habit"));

    expect(read()[0].habitGroup).toHaveLength(1);
    expect(read()[0].habitGroup?.[0]).toEqual(
        expect.objectContaining({ habitId: "h9", startTime: "08:00" })
    );
});

test("suggested slots resume after the items already in the section", () => {
    const section = buildSection();
    section.habitGroup = [{ habitId: "h1", startTime: "08:00", endTime: "08:20" } as any];

    expect(suggestSlots(section, 2)).toEqual([
        { startTime: "08:20", endTime: "08:40" },
        { startTime: "08:40", endTime: "09:00" }
    ]);
});

test("a section with no end time gives each item a 15 minute slot", () => {
    const section = buildSection();
    section.endTime = "";

    expect(suggestSlots(section, 2)).toEqual([
        { startTime: "08:00", endTime: "08:15" },
        { startTime: "08:15", endTime: "08:30" }
    ]);
});
