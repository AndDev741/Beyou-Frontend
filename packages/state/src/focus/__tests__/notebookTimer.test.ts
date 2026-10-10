import { describe, expect, it } from 'vitest';
import reducer, { pomodoroCycleCompleted, pomodoroPaused, pomodoroStarted, restoreFocusState } from '../focusSlice';
import { canStartNotebookFocus, notebookFocusStart } from '../notebookFocus';
import { DEFAULT_POMODORO_SETTINGS } from '../pomodoro';

const DATE = '2026-10-04';
const NOW = Date.UTC(2026, 9, 4, 12, 0, 0);

describe('a pomodoro started from a notebook page', () => {
    /**
     * "Focus 25 min" on a node files every cycle against the page, the break that follows
     * included, so the next pomodoro after the break still counts for the same node.
     */
    it('keeps the page through the handover and the next cycle', () => {
        let state = reducer(undefined, pomodoroStarted({
            groupId: '', kind: 'pomodoro', minutes: 25, now: 0, date: DATE,
            notebookPageId: 'page-1',
        }));
        expect(state.timer?.notebookPageId).toBe('page-1');

        state = reducer(state, pomodoroCycleCompleted());
        expect(state.timer?.notebookPageId).toBe('page-1');

        state = reducer(state, pomodoroStarted({ groupId: '', kind: 'shortBreak', minutes: 5, now: 1, date: DATE }));
        expect(state.timer?.notebookPageId).toBe('page-1');
    });

    it('a timer started from the focus screen has no page', () => {
        const state = reducer(undefined, pomodoroStarted({ groupId: 'hg1', kind: 'pomodoro', minutes: 25, now: 0, date: DATE }));
        expect(state.timer?.notebookPageId).toBeNull();
    });

    it('a page title an older build stored never comes back out of storage', () => {
        const stored = {
            timer: {
                groupId: '', notebookPageId: 'page-1', notebookTitle: 'Private study note', kind: 'pomodoro',
                startedAt: 0, endsAt: 1, pausedRemainingMs: null, durationMinutes: 25, rounds: 0, finished: false, date: DATE,
            },
        };
        const restored = restoreFocusState(stored);
        expect(restored.timer?.notebookPageId).toBe('page-1');
        expect(restored.timer).not.toHaveProperty('notebookTitle');
    });
});

describe('Focus 25 refuses to replace a live cycle', () => {
    const base = reducer(undefined, { type: '@@INIT' });
    const source = (focus = base) => ({ focus, perfil: { timezone: 'UTC' }, todayRoutine: null });

    it('starts when nothing is running', () => {
        const action = notebookFocusStart(source(), { id: 'page-1' }, null, NOW);
        expect(action?.payload).toMatchObject({
            kind: 'pomodoro', minutes: DEFAULT_POMODORO_SETTINGS.pomodoro, notebookPageId: 'page-1', groupId: '', date: DATE,
        });
    });

    it('starts again once the last cycle has finished', () => {
        const finished = reducer(
            reducer(base, pomodoroStarted({ groupId: 'hg1', kind: 'pomodoro', minutes: 25, now: NOW - 30 * 60_000, date: DATE })),
            pomodoroCycleCompleted(),
        );
        expect(canStartNotebookFocus(finished.timer, NOW)).toBe(true);
        expect(notebookFocusStart(source(finished), { id: 'page-1' }, null, NOW)).not.toBeNull();
    });

    it('returns nothing while a cycle runs', () => {
        const running = reducer(base, pomodoroStarted({ groupId: 'hg1', kind: 'pomodoro', minutes: 25, now: NOW - 60_000, date: DATE }));
        expect(canStartNotebookFocus(running.timer, NOW)).toBe(false);
        expect(notebookFocusStart(source(running), { id: 'page-1' }, null, NOW)).toBeNull();
    });

    it('returns nothing while a cycle is paused', () => {
        const paused = reducer(
            reducer(base, pomodoroStarted({ groupId: 'hg1', kind: 'pomodoro', minutes: 25, now: NOW - 60_000, date: DATE })),
            pomodoroPaused({ now: NOW - 30_000 }),
        );
        expect(canStartNotebookFocus(paused.timer, NOW)).toBe(false);
        expect(notebookFocusStart(source(paused), { id: 'page-1' }, null, NOW)).toBeNull();
    });

    it("runs on the linked habit's item when the habit is on today's routine", () => {
        const withRoutine = {
            ...source(),
            todayRoutine: { routine: { routineSections: [{ habitGroup: [{ id: 'hg-7', habitId: 'habit-7' }] }] } },
        };
        expect(notebookFocusStart(withRoutine, { id: 'page-1' }, 'habit-7', NOW)?.payload.groupId).toBe('hg-7');
        expect(notebookFocusStart(withRoutine, { id: 'page-1' }, 'habit-other', NOW)?.payload.groupId).toBe('');
    });
});
