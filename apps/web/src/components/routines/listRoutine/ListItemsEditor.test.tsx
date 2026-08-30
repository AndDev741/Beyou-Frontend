import { screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithProviders } from "../../../test/test-utils";
import type { RoutineListItem } from "@beyou/types/routine/routine";
import ListItemsEditor from "./ListItemsEditor";

// See `src/test/dndStub.tsx` for why the library is stubbed rather than driven.
vi.mock("react-beautiful-dnd", async () => (await import("../../../test/dndStub")).dndStub);

const item = (id: string, orderIndex: number): RoutineListItem => ({
    id,
    type: "HABIT",
    habitId: `h-${id}`,
    taskId: null,
    orderIndex,
});

const renderEditor = () => {
    const setItems = vi.fn();
    renderWithProviders(
        <ListItemsEditor items={[item("a", 0), item("b", 1)]} setItems={setItems} onAddItem={() => {}} />
    );
    return setItems;
};

// Nothing seeds the store here, so both rows render as "Unknown" and the queries go
// by position. What is under test is the move, not the naming.
const ids = (mock: ReturnType<typeof vi.fn>) =>
    mock.mock.calls[0][0].map((entry: RoutineListItem) => entry.id);

// StrictModeDroppable holds the list back for a frame, so the first query waits.
test("every row carries a drag handle for the pointer", async () => {
    renderEditor();

    expect(await screen.findAllByLabelText("ReorderItem")).toHaveLength(2);
});

test("the arrows move a row and stop at the ends", async () => {
    const setItems = renderEditor();

    const up = await screen.findAllByRole("button", { name: "MoveUp" });
    const down = screen.getAllByRole("button", { name: "MoveDown" });

    expect(up[0]).toBeDisabled();
    expect(down[1]).toBeDisabled();

    fireEvent.click(down[0]);

    expect(ids(setItems)).toEqual(["b", "a"]);
});
