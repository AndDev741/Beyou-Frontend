import { screen, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import rootReducer from "@beyou/state/rootReducer";
import { microTaskUpserted } from "@beyou/state";
import type { FocusMicroTask } from "@beyou/types/focus/focus";
import { renderWithProviders } from "../../test/test-utils";

vi.mock("@beyou/api/focus/focusApi", () => ({
    listFocusMicroTasks: vi.fn(),
    addFocusMicroTask: vi.fn(),
    toggleFocusMicroTask: vi.fn(),
    pinFocusMicroTask: vi.fn(),
    deleteFocusMicroTask: vi.fn(),
    reorderFocusMicroTasks: vi.fn(),
    recordFocusCycle: vi.fn(),
    getFocusDay: vi.fn(),
}));

// See `src/test/dndStub.tsx` for why the library is stubbed rather than driven.
vi.mock("react-beautiful-dnd", async () => (await import("../../test/dndStub")).dndStub);

import {
    addFocusMicroTask,
    deleteFocusMicroTask,
    listFocusMicroTasks,
    pinFocusMicroTask,
    reorderFocusMicroTasks,
    toggleFocusMicroTask,
} from "@beyou/api/focus/focusApi";
import MicroTasks from "./MicroTasks";

const baseState = rootReducer(undefined as never, { type: "@@INIT" } as never);
const buildStore = () => configureStore({ reducer: rootReducer, preloadedState: baseState });

const row = (over: Partial<FocusMicroTask> = {}): FocusMicroTask => ({
    id: "1",
    date: "2026-08-28",
    itemGroupId: "item-a",
    name: "Stretch",
    pinned: false,
    doneAt: null,
    ...over,
});

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listFocusMicroTasks).mockResolvedValue({ success: [] });
});

describe("the list belongs to the item", () => {
    test("is read from the server for the item on screen", async () => {
        vi.mocked(listFocusMicroTasks).mockResolvedValue({ success: [row()] });

        renderWithProviders(<MicroTasks itemGroupId="item-a" />, { storeOverride: buildStore() });

        expect(await screen.findByText("Stretch")).toBeInTheDocument();
        expect(listFocusMicroTasks).toHaveBeenCalledWith("item-a", expect.anything());
    });

    test("switching item re-reads, and shows THAT item's list", async () => {
        // The user's rule: changing item does not carry the list over. The server decides what is
        // on the new item (including any pinned name it materialised there); this side only asks.
        vi.mocked(listFocusMicroTasks).mockImplementation(async (itemGroupId: string) => ({
            success: itemGroupId === "item-a" ? [row({ id: "1", name: "Only on A" })] : [],
        }));
        const store = buildStore();
        const { rerender } = renderWithProviders(<MicroTasks itemGroupId="item-a" />, { storeOverride: store });
        expect(await screen.findByText("Only on A")).toBeInTheDocument();

        rerender(<MicroTasks itemGroupId="item-b" />);

        await waitFor(() => expect(listFocusMicroTasks).toHaveBeenCalledWith("item-b", expect.anything()));
        await waitFor(() => expect(screen.queryByText("Only on A")).not.toBeInTheDocument());
    });
});

describe("mutations go to the server, and the response is what lands", () => {
    test("adding posts to the item, unpinned, and shows the row the server returned", async () => {
        vi.mocked(addFocusMicroTask).mockResolvedValue({ success: row({ id: "9", name: "Water" }) });
        renderWithProviders(<MicroTasks itemGroupId="item-a" />, { storeOverride: buildStore() });

        await userEvent.click(await screen.findByTestId("focus-micro-task-add"));
        await userEvent.type(screen.getByTestId("focus-micro-task-input"), "Water{Enter}");

        expect(addFocusMicroTask).toHaveBeenCalledWith(
            { itemGroupId: "item-a", name: "Water", pinned: false },
            expect.anything()
        );
        expect(await screen.findByText("Water")).toBeInTheDocument();
    });

    test("an empty name posts nothing", async () => {
        renderWithProviders(<MicroTasks itemGroupId="item-a" />, { storeOverride: buildStore() });

        await userEvent.click(await screen.findByTestId("focus-micro-task-add"));
        await userEvent.keyboard("{Enter}");

        expect(addFocusMicroTask).not.toHaveBeenCalled();
    });

    test("ticking toggles on the server and shows its answer", async () => {
        vi.mocked(listFocusMicroTasks).mockResolvedValue({ success: [row()] });
        vi.mocked(toggleFocusMicroTask).mockResolvedValue({ success: row({ doneAt: "2026-08-28T10:00:00Z" }) });
        renderWithProviders(<MicroTasks itemGroupId="item-a" />, { storeOverride: buildStore() });

        await userEvent.click(await screen.findByTestId("focus-micro-task-check-1"));

        expect(toggleFocusMicroTask).toHaveBeenCalledWith("1", expect.anything());
        await waitFor(() => expect(screen.getByTestId("focus-micro-task-check-1")).toBeChecked());
    });

    test("pinning asks the server to keep the NAME, and reflects the answer", async () => {
        vi.mocked(listFocusMicroTasks).mockResolvedValue({ success: [row()] });
        vi.mocked(pinFocusMicroTask).mockResolvedValue({ success: row({ pinned: true }) });
        renderWithProviders(<MicroTasks itemGroupId="item-a" />, { storeOverride: buildStore() });

        await userEvent.click(await screen.findByTestId("focus-micro-task-pin-1"));

        expect(pinFocusMicroTask).toHaveBeenCalledWith("1", true, expect.anything());
        await waitFor(() =>
            expect(screen.getByTestId("focus-micro-task-pin-1")).toHaveAttribute("aria-pressed", "true")
        );
    });

    test("removing deletes on the server and drops the row", async () => {
        vi.mocked(listFocusMicroTasks).mockResolvedValue({ success: [row()] });
        vi.mocked(deleteFocusMicroTask).mockResolvedValue({ success: undefined });
        renderWithProviders(<MicroTasks itemGroupId="item-a" />, { storeOverride: buildStore() });

        await userEvent.click(await screen.findByTestId("focus-micro-task-remove-1"));

        expect(deleteFocusMicroTask).toHaveBeenCalledWith("1", expect.anything());
        await waitFor(() => expect(screen.queryByText("Stretch")).not.toBeInTheDocument());
    });

    test("a refused write leaves the list as it was, rather than showing a row that never saved", async () => {
        vi.mocked(addFocusMicroTask).mockResolvedValue({ error: { message: "nope" } });
        const store = buildStore();
        renderWithProviders(<MicroTasks itemGroupId="item-a" />, { storeOverride: store });

        await userEvent.click(await screen.findByTestId("focus-micro-task-add"));
        await userEvent.type(screen.getByTestId("focus-micro-task-input"), "Ghost{Enter}");

        await waitFor(() => expect(addFocusMicroTask).toHaveBeenCalled());
        expect(screen.queryByText("Ghost")).not.toBeInTheDocument();
        expect(store.getState().focus.microTasks["item-a"] ?? []).toEqual([]);
    });
});

describe("ordering", () => {
    const two = [row({ id: "1", name: "First" }), row({ id: "2", name: "Second" })];
    const names = () =>
        screen.getAllByTestId(/^focus-micro-task-(1|2)$/).map((node) => node.textContent ?? "");

    test("every row offers a labelled handle to drag by", async () => {
        vi.mocked(listFocusMicroTasks).mockResolvedValue({ success: two });
        renderWithProviders(<MicroTasks itemGroupId="item-a" />, { storeOverride: buildStore() });

        expect(await screen.findByTestId("focus-micro-task-handle-1")).toBeInTheDocument();
        // Named after the row it moves, so the control says what it does out of context.
        expect(screen.getByTestId("focus-micro-task-handle-2")).toHaveAttribute("aria-label", "ReorderItem");
    });

    test("dropping sends the whole list in its new order and keeps the server's answer", async () => {
        vi.mocked(listFocusMicroTasks).mockResolvedValue({ success: two });
        const swapped = [row({ id: "2", name: "Second" }), row({ id: "1", name: "First" })];
        vi.mocked(reorderFocusMicroTasks).mockResolvedValue({ success: swapped });
        renderWithProviders(<MicroTasks itemGroupId="item-a" />, { storeOverride: buildStore() });
        await screen.findByTestId("focus-micro-task-1");

        await userEvent.click(screen.getByTestId("drop-second-onto-first"));

        // The whole list, not one move: the client already holds what it is showing.
        expect(reorderFocusMicroTasks).toHaveBeenCalledWith("item-a", ["2", "1"], expect.anything());
        await waitFor(() => expect(names()[0]).toContain("Second"));
    });

    test("a tick that lands while the reorder is in flight survives its rollback", async () => {
        // The bug this guards: the rollback used to put back a SNAPSHOT of the rows taken before
        // the drag, so a toggle that landed in between came back unticked and a deleted row came
        // back from the dead. Order and content are separate facts; only the order is rolled back.
        vi.mocked(listFocusMicroTasks).mockResolvedValue({ success: two });
        let refuse: (() => void) | null = null;
        vi.mocked(reorderFocusMicroTasks).mockImplementation(
            () =>
                new Promise((resolve) => {
                    refuse = () => resolve({ error: { message: "nope" } });
                }),
        );
        const store = buildStore();
        renderWithProviders(<MicroTasks itemGroupId="item-a" />, { storeOverride: store });
        await screen.findByTestId("focus-micro-task-1");

        await userEvent.click(screen.getByTestId("drop-second-onto-first"));
        // The server answered a toggle while the reorder was still pending.
        store.dispatch(microTaskUpserted(row({ id: "1", name: "First", doneAt: "2026-08-28T10:00:00Z" })));
        refuse!();

        await waitFor(() => expect(names()[0]).toContain("First"));
        expect(screen.getByTestId("focus-micro-task-check-1")).toBeChecked();
    });

    test("a refused reorder puts the old order back", async () => {
        vi.mocked(listFocusMicroTasks).mockResolvedValue({ success: two });
        vi.mocked(reorderFocusMicroTasks).mockResolvedValue({ error: { message: "nope" } });
        renderWithProviders(<MicroTasks itemGroupId="item-a" />, { storeOverride: buildStore() });
        await screen.findByTestId("focus-micro-task-1");

        await userEvent.click(screen.getByTestId("drop-second-onto-first"));

        // The optimistic move is undone rather than left on screen looking saved.
        await waitFor(() => expect(names()[0]).toContain("First"));
    });
});
