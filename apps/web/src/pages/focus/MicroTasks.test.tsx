import { screen, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import rootReducer from "@beyou/state/rootReducer";
import { renderWithProviders } from "../../test/test-utils";
import MicroTasks from "./MicroTasks";

const baseState = rootReducer(undefined as never, { type: "@@INIT" } as never);
const DATE = "2026-08-28";
const STORAGE_KEY = "beyou-focus-micro-tasks";

const buildStore = () => configureStore({ reducer: rootReducer, preloadedState: baseState });

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    localStorage.clear();
});

/**
 * Opens the field only when it is closed: submitting leaves it open on purpose, so the add BUTTON
 * is gone after the first call.
 */
const add = async (name: string) => {
    const opener = screen.queryByTestId("focus-micro-task-add");
    if (opener) await userEvent.click(opener);
    await userEvent.type(screen.getByTestId("focus-micro-task-input"), name);
    await userEvent.keyboard("{Enter}");
};

describe("adding", () => {
    test("one field and Enter, and it lands as a one-off", async () => {
        const store = buildStore();
        renderWithProviders(<MicroTasks date={DATE} />, { storeOverride: store });

        await add("Stretch");

        expect(screen.getByText("Stretch")).toBeInTheDocument();
        expect(store.getState().focus.microTasks[0]).toMatchObject({
            name: "Stretch",
            pinned: false,
        });
    });

    test("the field stays open, because a checklist is typed in a burst", async () => {
        renderWithProviders(<MicroTasks date={DATE} />, { storeOverride: buildStore() });

        await add("Stretch");
        await userEvent.type(screen.getByTestId("focus-micro-task-input"), "Water{Enter}");

        expect(screen.getByText("Stretch")).toBeInTheDocument();
        expect(screen.getByText("Water")).toBeInTheDocument();
    });

    test("an empty name adds nothing", async () => {
        const store = buildStore();
        renderWithProviders(<MicroTasks date={DATE} />, { storeOverride: store });

        await userEvent.click(screen.getByTestId("focus-micro-task-add"));
        await userEvent.keyboard("{Enter}");

        expect(store.getState().focus.microTasks).toEqual([]);
    });
});

describe("ticking", () => {
    test("done is a DATE, so tomorrow it comes back fresh", async () => {
        // A boolean would need something to reset it, and nothing would.
        const store = buildStore();
        const { unmount } = renderWithProviders(<MicroTasks date={DATE} />, { storeOverride: store });
        await add("Stretch");

        await userEvent.click(screen.getByTestId("focus-micro-task-check-1"));
        expect(store.getState().focus.microTasks[0].doneOn).toBe(DATE);
        unmount();

        renderWithProviders(<MicroTasks date="2026-08-29" />, { storeOverride: store });
        expect(screen.getByTestId("focus-micro-task-check-1")).not.toBeChecked();
    });
});

describe("keeping one for next time", () => {
    test("pinning writes it to storage; a one-off is never written", async () => {
        renderWithProviders(<MicroTasks date={DATE} />, { storeOverride: buildStore() });
        await add("One-off");
        await add("Standing");

        await waitFor(() =>
            expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")).toHaveLength(0)
        );

        await userEvent.click(screen.getByTestId("focus-micro-task-pin-2"));

        await waitFor(() => {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
            expect(stored).toHaveLength(1);
            expect(stored[0].name).toBe("Standing");
        });
    });

    test("a stored one is read back on mount", async () => {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify([{ id: "7", name: "Water", pinned: true, doneOn: null }])
        );

        renderWithProviders(<MicroTasks date={DATE} />, { storeOverride: buildStore() });

        expect(await screen.findByText("Water")).toBeInTheDocument();
    });

    test("a task typed before the read is not swallowed by it", async () => {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify([{ id: "7", name: "Water", pinned: true, doneOn: null }])
        );
        renderWithProviders(<MicroTasks date={DATE} />, { storeOverride: buildStore() });
        await screen.findByText("Water");

        await add("Typed");

        expect(screen.getByText("Water")).toBeInTheDocument();
        expect(screen.getByText("Typed")).toBeInTheDocument();
    });

    test("junk in storage is ignored rather than crashing the render", async () => {
        // User-editable storage: a half-written entry must not reach the reducer.
        localStorage.setItem(STORAGE_KEY, '[{"id":1},{"name":""},null,"nope"]');

        renderWithProviders(<MicroTasks date={DATE} />, { storeOverride: buildStore() });

        expect(screen.getByTestId("focus-micro-tasks")).toBeInTheDocument();
        expect(screen.getByTestId("focus-micro-task-add")).toBeInTheDocument();
    });

    test("unreadable storage is ignored too", async () => {
        localStorage.setItem(STORAGE_KEY, "{not json");

        renderWithProviders(<MicroTasks date={DATE} />, { storeOverride: buildStore() });

        expect(screen.getByTestId("focus-micro-tasks")).toBeInTheDocument();
    });
});

describe("removing", () => {
    test("takes it off the list and out of storage", async () => {
        renderWithProviders(<MicroTasks date={DATE} />, { storeOverride: buildStore() });
        await add("Stretch");
        await userEvent.click(screen.getByTestId("focus-micro-task-pin-1"));
        await waitFor(() =>
            expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")).toHaveLength(1)
        );

        await userEvent.click(screen.getByTestId("focus-micro-task-remove-1"));

        expect(screen.queryByText("Stretch")).not.toBeInTheDocument();
        await waitFor(() =>
            expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")).toHaveLength(0)
        );
    });
});
