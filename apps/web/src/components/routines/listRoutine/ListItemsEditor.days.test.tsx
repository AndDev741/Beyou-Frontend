import { screen, fireEvent, within } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithProviders } from "../../../test/test-utils";
import type { RoutineListItem } from "@beyou/types/routine/routine";
import ListItemsEditor from "./ListItemsEditor";

vi.mock("react-beautiful-dnd", async () => (await import("../../../test/dndStub")).dndStub);

const items = (): RoutineListItem[] => [
    { id: "a", type: "HABIT", habitId: "h-a", taskId: null, orderIndex: 0 },
    { id: "b", type: "TASK", habitId: null, taskId: "t-b", orderIndex: 1, days: ["Saturday", "Sunday"] },
];

test("a row's days open under it and a press updates that row only", async () => {
    const setItems = vi.fn();
    renderWithProviders(<ListItemsEditor items={items()} setItems={setItems} onAddItem={() => {}} />);

    const [firstDays] = await screen.findAllByRole("button", { name: "ItemDaysFor" });
    fireEvent.click(firstDays);
    expect(firstDays).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(within(screen.getByRole("group", { name: "Days" })).getByRole("button", { name: "Sunday" }));

    const next: RoutineListItem[] = setItems.mock.calls[0][0](items());
    expect(next[0].days).toEqual(["Sunday"]);
    expect(next[1].days).toEqual(["Saturday", "Sunday"]);
});

test("a row with days shows them in short form", async () => {
    renderWithProviders(<ListItemsEditor items={items()} setItems={vi.fn()} onAddItem={() => {}} />);

    // The test i18n returns keys, so the chip reads the short-day keys.
    expect(await screen.findByText("Sat · Sun")).toBeInTheDocument();
});
