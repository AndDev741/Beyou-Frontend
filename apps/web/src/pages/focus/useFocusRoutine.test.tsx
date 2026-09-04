import { act, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, test, vi } from "vitest";
import rootReducer from "@beyou/state/rootReducer";
import type { RefreshReason } from "@beyou/state/sync/autoRefresh";

vi.mock("@beyou/api/routine/getTodayRoutine", () => ({ default: vi.fn() }));
vi.mock("@beyou/api/habits/getHabits", () => ({ default: vi.fn() }));
vi.mock("@beyou/api/tasks/getTasks", () => ({ default: vi.fn() }));

// The auto-refresh hook is replaced by a capture: the point here is what the screen's loader
// does when that hook fires it, not the hook's own timing (it has its own tests).
const autoRefresh = vi.hoisted(() => ({
    refresh: null as ((reason: RefreshReason) => Promise<unknown>) | null
}));
vi.mock("../../hooks/useAutoRefresh", () => ({
    useAutoRefresh: (refresh: (reason: RefreshReason) => Promise<unknown>) => {
        autoRefresh.refresh = refresh;
    }
}));

import getTodayRoutine from "@beyou/api/routine/getTodayRoutine";
import getHabits from "@beyou/api/habits/getHabits";
import getTasks from "@beyou/api/tasks/getTasks";
import { useFocusRoutine } from "./useFocusRoutine";

const mockedRoutine = vi.mocked(getTodayRoutine);
const mockedHabits = vi.mocked(getHabits);
const mockedTasks = vi.mocked(getTasks);

const habit = (name: string) => ({ id: "h-1", name, iconId: "icon", motivationalPhrase: "" });

function Probe() {
    const { loading, error } = useFocusRoutine();
    return (
        <p>
            {loading ? "loading" : "ready"}|{error ?? "no-error"}
        </p>
    );
}

const renderProbe = () => {
    const store = configureStore({ reducer: rootReducer });
    render(
        <Provider store={store}>
            <Probe />
        </Provider>
    );
    return store;
};

beforeEach(() => {
    vi.clearAllMocks();
    autoRefresh.refresh = null;
    mockedRoutine.mockResolvedValue({ success: null } as never);
    mockedHabits.mockResolvedValue({ success: [habit("Drink water")] } as never);
    mockedTasks.mockResolvedValue({ success: [] } as never);
});

describe("useFocusRoutine", () => {
    /**
     * The screen was the one data screen with no auto-refresh, and the one people leave open
     * longest. Names come from the habits slice, so a rename made elsewhere in that window
     * never arrived. This pins the loader to the refresh policy: whatever fires it, the slices
     * end up holding what the server holds now.
     */
    test("joins the auto-refresh policy, and a refresh brings a rename into the slice", async () => {
        const store = renderProbe();

        await waitFor(() => expect(store.getState().habits.habits[0]?.name).toBe("Drink water"));
        expect(screen.getByText("ready|no-error")).toBeInTheDocument();
        expect(autoRefresh.refresh).not.toBeNull();

        mockedHabits.mockResolvedValue({ success: [habit("Drink water, renamed")] } as never);
        await act(async () => {
            await autoRefresh.refresh!("foreground");
        });

        expect(store.getState().habits.habits[0]?.name).toBe("Drink water, renamed");
        expect(mockedHabits).toHaveBeenCalledTimes(2);
    });

    test("a background refresh that fails keeps the screen as it was, and says nothing", async () => {
        const store = renderProbe();
        await waitFor(() => expect(store.getState().habits.habits[0]?.name).toBe("Drink water"));

        mockedHabits.mockResolvedValue({ error: "RATE_LIMIT" } as never);
        await act(async () => {
            await autoRefresh.refresh!("interval");
        });

        // Not wiped, and no banner: a routine that was fine a minute ago is still fine.
        expect(store.getState().habits.habits[0]?.name).toBe("Drink water");
        expect(screen.getByText("ready|no-error")).toBeInTheDocument();
    });

    test("the first load has nothing to fall back on, so its failure is reported", async () => {
        mockedHabits.mockResolvedValue({ error: "RATE_LIMIT" } as never);
        renderProbe();

        expect(await screen.findByText("ready|RATE_LIMIT")).toBeInTheDocument();
    });
});
