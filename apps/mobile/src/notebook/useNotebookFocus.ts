import { useCallback } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { DEFAULT_POMODORO_SETTINGS, pomodoroStarted, timerStatus, todayInZone } from '@beyou/state';
import type { AppDispatch, RootState } from '../store';

/**
 * "Focus 25" on a notebook page: starts the app's one pomodoro, filed against the page.
 *
 * The same timer the focus screen runs, so `RunningTimerHub` shows it on every screen of the app
 * group and `PomodoroOwner` reports it when it ends, with the page attached (that is what the
 * node's "focused" figure counts). When the topic is linked to a habit that is on today's routine,
 * the cycle runs on that routine item too, so the focus screen opens on the habit.
 *
 * Returns false and starts nothing when a cycle is already running or paused: replacing it would
 * throw away minutes somebody is in the middle of.
 */
export function useNotebookFocus() {
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();

  return useCallback(
    (page: { id: string; title: string }, habitId?: string | null): boolean => {
      const state = store.getState();
      const status = timerStatus(state.focus.timer, Date.now());
      if (status === 'running' || status === 'paused') return false;
      const settings = state.focus.settings ?? DEFAULT_POMODORO_SETTINGS;
      dispatch(
        pomodoroStarted({
          groupId: habitId ? habitGroupIdFor(state, habitId) : '',
          kind: 'pomodoro',
          minutes: settings.pomodoro,
          now: Date.now(),
          date: todayInZone(state.perfil.timezone),
          notebookPageId: page.id,
          notebookTitle: page.title,
        }),
      );
      return true;
    },
    [dispatch, store],
  );
}

/** The habit's item in today's routine, or "" when the habit is not on it today. */
export function habitGroupIdFor(state: RootState, habitId: string): string {
  for (const section of state.todayRoutine?.routine?.routineSections ?? []) {
    for (const group of section.habitGroup ?? []) {
      if (group.habitId === habitId && group.id) return group.id;
    }
  }
  return '';
}
