import { todayInZone } from '../date/isoDay';
import { pomodoroStarted, type focusState } from './focusSlice';
import { DEFAULT_POMODORO_SETTINGS, timerStatus, type FocusTimer } from './pomodoro';

/**
 * "Focus 25" on a notebook page, the one rule both apps follow.
 *
 * The app has ONE pomodoro. A page may only start it when nothing is running or paused, because
 * replacing a live cycle throws away minutes somebody is in the middle of, and the cycle it
 * replaced is never reported. Web shipped without this check while mobile had it, which is why
 * it lives here now and the two hooks only dispatch what this returns.
 */
export function canStartNotebookFocus(timer: FocusTimer | null | undefined, now: number): boolean {
  const status = timerStatus(timer, now);
  return status !== 'running' && status !== 'paused';
}

/** The slices this reads. Structural, so the web and mobile stores both fit. */
type NotebookFocusSource = {
  focus: Pick<focusState, 'timer' | 'settings'>;
  perfil: { timezone?: string | null };
  todayRoutine?: {
    routine?: {
      routineSections?: Array<{ habitGroup?: Array<{ id?: string | null; habitId?: string | null }> | null }> | null;
    } | null;
  } | null;
};

/**
 * The action that starts a page's pomodoro, or null when a cycle is already running or paused.
 *
 * Returns the action rather than dispatching it so the rule stays a pure function of the state:
 * the hooks read the store, call this, and dispatch whatever comes back.
 *
 * When the topic is linked to a habit that is on today's routine, the cycle runs on that routine
 * item too, so the focus screen opens on the habit and one tap checks it in.
 */
export function notebookFocusStart(
  state: NotebookFocusSource,
  page: { id: string },
  habitId: string | null | undefined,
  now: number,
) {
  if (!canStartNotebookFocus(state.focus.timer, now)) return null;
  const settings = state.focus.settings ?? DEFAULT_POMODORO_SETTINGS;
  return pomodoroStarted({
    groupId: habitId ? habitGroupIdFor(state, habitId) : '',
    kind: 'pomodoro',
    minutes: settings.pomodoro,
    now,
    date: todayInZone(state.perfil.timezone, new Date(now)),
    notebookPageId: page.id,
  });
}

/** The habit's item in today's routine, or "" when the habit is not on it today. */
export function habitGroupIdFor(state: NotebookFocusSource, habitId: string): string {
  for (const section of state.todayRoutine?.routine?.routineSections ?? []) {
    for (const group of section.habitGroup ?? []) {
      if (group.habitId === habitId && group.id) return group.id;
    }
  }
  return '';
}
