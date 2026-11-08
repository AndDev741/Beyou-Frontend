import { screen, fireEvent, within } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "@beyou/state/rootReducer";
import { vi } from "vitest";
import { renderWithProviders } from "../../../test/test-utils";
import type { RoutineSection } from "@beyou/types/routine/routineSection";
import SectionsEditor from "./SectionsEditor";

vi.mock("react-beautiful-dnd", async () => (await import("../../../test/dndStub")).dndStub);

const baseState = rootReducer(undefined as never, { type: "@@INIT" });

const sections = (): RoutineSection[] => [
    {
        id: "s1",
        name: "Morning",
        iconId: "",
        startTime: "08:00",
        endTime: "10:00",
        order: 0,
        taskGroup: [],
        habitGroup: [{ id: "g1", habitId: "h1", startTime: "08:00", endTime: "08:30" }],
    },
];

const renderEditor = (scheduleDays?: string[]) => {
    const setRoutineSection = vi.fn();
    const storeOverride = configureStore({
        reducer: rootReducer,
        preloadedState: {
            ...baseState,
            habits: { ...baseState.habits, habits: [{ id: "h1", name: "Clean the tank", iconId: "" }] },
        } as never,
    });
    renderWithProviders(
        <SectionsEditor
            sections={sections()}
            setRoutineSection={setRoutineSection}
            onEditSection={() => {}}
            onDeleteSection={() => {}}
            onAddSection={() => {}}
            scheduleDays={scheduleDays}
        />,
        { storeOverride }
    );
    return setRoutineSection;
};

/** The editor hands setRoutineSection an updater; run it on the sections it started from. */
const saved = (mock: ReturnType<typeof vi.fn>): RoutineSection[] => mock.mock.calls[0][0](sections());

const openDays = async () => {
    fireEvent.click(await screen.findByRole("button", { name: "Morning" }));
    fireEvent.click(screen.getByRole("button", { name: "ItemDaysFor" }));
    return screen.getByRole("group", { name: "Days" });
};

test("the days button opens the item editor with every day of the routine as default", async () => {
    renderEditor();
    const group = await openDays();

    expect(within(group).getByText("ItemDaysFollowRoutine")).toBeInTheDocument();
    expect(within(group).queryAllByRole("button", { pressed: true })).toHaveLength(0);
    expect(within(group).getAllByRole("button", { pressed: false })).toHaveLength(7);
});

test("picking a day and saving writes it to the item", async () => {
    const setRoutineSection = renderEditor();
    const group = await openDays();

    fireEvent.click(within(group).getByRole("button", { name: "Saturday" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(saved(setRoutineSection)[0].habitGroup?.[0].days).toEqual(["Saturday"]);
});

test("saving without touching the days leaves the field off, so the server keeps it", async () => {
    const setRoutineSection = renderEditor();
    await openDays();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect("days" in (saved(setRoutineSection)[0].habitGroup?.[0] ?? {})).toBe(false);
});

test("warns when the item's days never meet the routine's schedule", async () => {
    renderEditor(["Saturday", "Sunday"]);
    const group = await openDays();

    fireEvent.click(within(group).getByRole("button", { name: "Monday" }));

    expect(within(group).getByText("ItemDaysMissSchedule")).toBeInTheDocument();
});
