import { screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithProviders } from "../../../test/test-utils";
import type { RoutineSection } from "@beyou/types/routine/routineSection";
import SectionsEditor from "./SectionsEditor";

// See `src/test/dndStub.tsx` for why the library is stubbed rather than driven.
vi.mock("react-beautiful-dnd", async () => (await import("../../../test/dndStub")).dndStub);

const section = (id: string, name: string, order: number): RoutineSection => ({
    id,
    name,
    iconId: "",
    startTime: "06:00",
    endTime: "07:00",
    order,
    taskGroup: [],
    // A section with nothing in it renders open, and the arrows sit in the open body.
    // One item keeps both sections closed so the test can expand exactly one.
    habitGroup: [{ habitId: `h-${id}`, startTime: "06:00" }],
});

const renderEditor = () => {
    const setRoutineSection = vi.fn();
    renderWithProviders(
        <SectionsEditor
            sections={[section("a", "Morning", 0), section("b", "Evening", 1)]}
            setRoutineSection={setRoutineSection}
            onEditSection={() => {}}
            onDeleteSection={() => {}}
            onAddSection={() => {}}
        />
    );
    return setRoutineSection;
};

const names = (mock: ReturnType<typeof vi.fn>) =>
    mock.mock.calls[0][0].map((s: RoutineSection) => s.name);

// The grip is what the redesign lost: the handle moved onto the section's own icon,
// so dragging still worked and looked like nothing at all.
// StrictModeDroppable holds the list back for a frame, so the first query waits.
test("every section carries a visible drag handle", async () => {
    renderEditor();

    expect(await screen.findAllByLabelText("ReorderItem")).toHaveLength(2);
});

test("dropping a section on another reorders the list", () => {
    const setRoutineSection = renderEditor();

    fireEvent.click(screen.getByTestId("drop-second-onto-first"));

    expect(names(setRoutineSection)).toEqual(["Evening", "Morning"]);
});

test("the arrows move a section and stop at the ends", async () => {
    const setRoutineSection = renderEditor();

    const toggle = await screen.findByRole("button", { name: "Morning" });
    // They live inside the open section, so nothing shows until it is expanded.
    expect(screen.queryByRole("button", { name: "MoveDown" })).not.toBeInTheDocument();
    fireEvent.click(toggle);

    expect(screen.getByRole("button", { name: "MoveUp" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "MoveDown" }));

    expect(names(setRoutineSection)).toEqual(["Evening", "Morning"]);
});
