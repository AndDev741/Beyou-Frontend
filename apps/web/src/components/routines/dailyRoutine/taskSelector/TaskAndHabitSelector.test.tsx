import { renderWithProviders } from "../../../../test/test-utils";
import { screen, fireEvent } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { vi } from "vitest";
import rootReducer from "@beyou/state/rootReducer";
import TaskAndHabitSelector from "./TaskAndHabitSelector";
import { suggestSlots } from "@beyou/state";
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

test("each pick lands in the tray with the next free slot, and confirming commits them", () => {
    const read = setup(buildSection());

    fireEvent.click(screen.getByRole("checkbox", { name: /drink water/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /stretch/i }));

    // Nothing has reached the section yet — the tray is holding it.
    expect(read()[0].habitGroup).toEqual([]);
    // The button counts what is in the tray.
    fireEvent.click(screen.getByRole("button", { name: "Add 2" }));

    expect(read()[0].habitGroup).toEqual([
        expect.objectContaining({ habitId: "h1", startTime: "08:00", endTime: "08:15" }),
        expect.objectContaining({ habitId: "h2", startTime: "08:15", endTime: "08:30" })
    ]);
});

test("the time can be fixed in the tray before it reaches the section", () => {
    const read = setup(buildSection());

    fireEvent.click(screen.getByRole("checkbox", { name: /drink water/i }));
    fireEvent.change(screen.getByLabelText(/^End time Drink water$/), { target: { value: "08:45" } });
    fireEvent.click(screen.getByRole("button", { name: "Add 1" }));

    expect(read()[0].habitGroup).toEqual([
        expect.objectContaining({ habitId: "h1", startTime: "08:00", endTime: "08:45" })
    ]);
});

/** What the section already holds opens in the tray: an old time can be fixed in
 *  the same pass, instead of closing and reopening through the section list. */
test("what the section already has opens in the tray", () => {
    const section = buildSection();
    section.habitGroup = [{ id: "g1", habitId: "h1", startTime: "08:00", endTime: "08:10" } as any];
    const read = setup(section);

    fireEvent.change(screen.getByLabelText(/^Start time Drink water$/), { target: { value: "08:05" } });
    fireEvent.click(screen.getByRole("button", { name: "Add 1" }));

    expect(read()[0].habitGroup).toEqual([
        expect.objectContaining({ id: "g1", habitId: "h1", startTime: "08:05", endTime: "08:10" })
    ]);
});

test("what is already in the tray cannot be picked twice", () => {
    const section = buildSection();
    section.habitGroup = [{ habitId: "h1", startTime: "08:00", endTime: "08:10" } as any];
    setup(section);

    expect(screen.getByRole("checkbox", { name: /drink water/i })).toBeDisabled();
    // The test i18n returns the raw key, without interpolating the section name.
    expect(screen.getByText("AlreadyInSection")).toBeInTheDocument();
});

test("search narrows the list", () => {
    setup(buildSection());

    fireEvent.change(screen.getByLabelText("SearchHabitOrTask"), { target: { value: "read" } });

    expect(screen.getByRole("checkbox", { name: /read/i })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /stretch/i })).not.toBeInTheDocument();
});

test("a quick-created habit lands in the tray, ready to confirm", () => {
    const read = setup(buildSection());

    fireEvent.click(screen.getByRole("button", { name: "NewHabit" }));
    fireEvent.click(screen.getByText("mock create habit"));
    fireEvent.click(screen.getByRole("button", { name: "Add 1" }));

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
