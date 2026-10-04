import { useCallback } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import type { RootState } from "@beyou/state/rootReducer";
import { DEFAULT_POMODORO_SETTINGS, pomodoroStarted, todayInZone } from "@beyou/state";

/**
 * "Focus 25 min" on a notebook page: starts the app's one pomodoro, filed against the page.
 *
 * The same timer the focus screen runs, so the running-timer hub shows it and `PomodoroOwner`
 * reports it when it ends, with the page attached (that is what the node's "focused" figure
 * counts). When the topic is linked to a habit that is on today's routine, the cycle runs on
 * that routine item too, so the focus screen opens on the habit and one tap checks it in.
 */
export function useNotebookFocus() {
    const dispatch = useDispatch();
    const store = useStore();
    const timer = useSelector((state: RootState) => state.focus.timer);

    const start = useCallback(
        (page: { id: string; title: string }, habitId?: string | null) => {
            const state = store.getState() as RootState;
            const settings = state.focus.settings ?? DEFAULT_POMODORO_SETTINGS;
            const groupId = habitId ? habitGroupIdFor(state, habitId) : "";
            dispatch(
                pomodoroStarted({
                    groupId,
                    kind: "pomodoro",
                    minutes: settings.pomodoro,
                    now: Date.now(),
                    date: todayInZone(state.perfil.timezone),
                    notebookPageId: page.id,
                    notebookTitle: page.title,
                })
            );
        },
        [dispatch, store]
    );

    return { start, timer };
}

/** The habit's item in today's routine, or "" when the habit is not on it today. */
function habitGroupIdFor(state: RootState, habitId: string): string {
    for (const section of state.todayRoutine?.routine?.routineSections ?? []) {
        for (const group of section.habitGroup ?? []) {
            if (group.habitId === habitId && group.id) return group.id;
        }
    }
    return "";
}
