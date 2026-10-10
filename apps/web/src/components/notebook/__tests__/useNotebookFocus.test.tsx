import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import rootReducer from "@beyou/state/rootReducer";
import { pomodoroPaused, pomodoroStarted } from "@beyou/state";
import { useNotebookFocus } from "../useNotebookFocus";

const baseState = rootReducer(undefined as never, { type: "@@INIT" } as never);
const NOW = new Date(2026, 9, 9, 10, 0, 0);
const DATE = "2026-10-09";

const makeStore = () => configureStore({ reducer: rootReducer, preloadedState: baseState });

function renderFocus(store: ReturnType<typeof makeStore>) {
    const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
    return renderHook(() => useNotebookFocus(), { wrapper });
}

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
});

afterEach(() => {
    vi.useRealTimers();
});

describe("Focus 25 on a notebook page", () => {
    test("starts a pomodoro filed against the page when nothing is running", () => {
        const store = makeStore();
        const { result } = renderFocus(store);

        let started = false;
        act(() => {
            started = result.current.start({ id: "page-1", title: "Trees" });
        });

        expect(started).toBe(true);
        expect(store.getState().focus.timer?.notebookPageId).toBe("page-1");
        expect(store.getState().focus.timer?.kind).toBe("pomodoro");
    });

    test("leaves a running cycle alone", () => {
        const store = makeStore();
        store.dispatch(pomodoroStarted({ groupId: "hg1", kind: "pomodoro", minutes: 25, now: NOW.getTime() - 5 * 60_000, date: DATE }));
        const before = store.getState().focus.timer;
        const { result } = renderFocus(store);

        let started = true;
        act(() => {
            started = result.current.start({ id: "page-1", title: "Trees" });
        });

        expect(started).toBe(false);
        expect(store.getState().focus.timer).toEqual(before);
    });

    test("leaves a paused cycle alone", () => {
        const store = makeStore();
        store.dispatch(pomodoroStarted({ groupId: "hg1", kind: "pomodoro", minutes: 25, now: NOW.getTime() - 5 * 60_000, date: DATE }));
        store.dispatch(pomodoroPaused({ now: NOW.getTime() - 60_000 }));
        const before = store.getState().focus.timer;
        const { result } = renderFocus(store);

        act(() => {
            result.current.start({ id: "page-2", title: "Graphs" });
        });

        expect(store.getState().focus.timer).toEqual(before);
    });
});
