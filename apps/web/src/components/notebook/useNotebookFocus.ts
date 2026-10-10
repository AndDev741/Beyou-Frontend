import { useCallback } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import type { RootState } from "@beyou/state/rootReducer";
import { notebookFocusStart } from "@beyou/state/focus/notebookFocus";

/**
 * "Focus 25 min" on a notebook page: starts the app's one pomodoro, filed against the page.
 *
 * The same timer the focus screen runs, so the running-timer hub shows it and `PomodoroOwner`
 * reports it when it ends, with the page attached (that is what the node's "focused" figure
 * counts). Whether it may start, and on which routine item, is `notebookFocusStart`'s call, the
 * rule mobile follows too: returns false and starts nothing while a cycle is running or paused.
 */
export function useNotebookFocus() {
    const dispatch = useDispatch();
    const store = useStore();
    const timer = useSelector((state: RootState) => state.focus.timer);

    const start = useCallback(
        (page: { id: string; title: string }, habitId?: string | null): boolean => {
            const action = notebookFocusStart(store.getState() as RootState, page, habitId, Date.now());
            if (!action) return false;
            dispatch(action);
            return true;
        },
        [dispatch, store]
    );

    return { start, timer };
}
