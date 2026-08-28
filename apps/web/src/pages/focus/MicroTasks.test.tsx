import { screen, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import rootReducer from "@beyou/state/rootReducer";
import type { FocusMicroTask } from "@beyou/types/focus/focus";
import { renderWithProviders } from "../../test/test-utils";

vi.mock("@beyou/api/focus/focusApi", () => ({
    listFocusMicroTasks: vi.fn(),
    addFocusMicroTask: vi.fn(),
    toggleFocusMicroTask: vi.fn(),
    pinFocusMicroTask: vi.fn(),
    deleteFocusMicroTask: vi.fn(),
    recordFocusCycle: vi.fn(),
    getFocusDay: vi.fn(),
}));

import {
    addFocusMicroTask,
    deleteFocusMicroTask,
    listFocusMicroTasks,
    pinFocusMicroTask,
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
