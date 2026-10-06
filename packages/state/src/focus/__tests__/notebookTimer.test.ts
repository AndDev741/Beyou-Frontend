import { describe, expect, it } from 'vitest';
import reducer, { pomodoroCycleCompleted, pomodoroStarted } from '../focusSlice';

const DATE = '2026-10-04';

describe('a pomodoro started from a notebook page', () => {
    /**
     * "Focus 25 min" on a node files every cycle against the page, the break that follows
     * included, so the next pomodoro after the break still counts for the same node.
     */
    it('keeps the page through the handover and the next cycle', () => {
        let state = reducer(undefined, pomodoroStarted({
            groupId: '', kind: 'pomodoro', minutes: 25, now: 0, date: DATE,
            notebookPageId: 'page-1', notebookTitle: 'Trees',
        }));
        expect(state.timer?.notebookPageId).toBe('page-1');

        state = reducer(state, pomodoroCycleCompleted());
        expect(state.timer?.notebookPageId).toBe('page-1');

        state = reducer(state, pomodoroStarted({ groupId: '', kind: 'shortBreak', minutes: 5, now: 1, date: DATE }));
        expect(state.timer?.notebookPageId).toBe('page-1');
        expect(state.timer?.notebookTitle).toBe('Trees');
    });

    it('a timer started from the focus screen has no page', () => {
        const state = reducer(undefined, pomodoroStarted({ groupId: 'hg1', kind: 'pomodoro', minutes: 25, now: 0, date: DATE }));
        expect(state.timer?.notebookPageId).toBeNull();
    });
});
