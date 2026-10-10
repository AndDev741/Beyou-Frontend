import { useCallback } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { notebookFocusStart } from '@beyou/state/focus/notebookFocus';
import type { AppDispatch, RootState } from '../store';

/**
 * "Focus 25" on a notebook page: starts the app's one pomodoro, filed against the page.
 *
 * The same timer the focus screen runs, so `RunningTimerHub` shows it on every screen of the app
 * group and `PomodoroOwner` reports it when it ends, with the page attached (that is what the
 * node's "focused" figure counts). Whether it may start, and on which routine item, is
 * `notebookFocusStart`'s call, shared with web.
 *
 * Returns false and starts nothing when a cycle is already running or paused: replacing it would
 * throw away minutes somebody is in the middle of.
 */
export function useNotebookFocus() {
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();

  return useCallback(
    (page: { id: string; title: string }, habitId?: string | null): boolean => {
      const action = notebookFocusStart(store.getState(), page, habitId, Date.now());
      if (!action) return false;
      dispatch(action);
      return true;
    },
    [dispatch, store],
  );
}
