import { describe, expect, it } from 'vitest';
import type { FocusItem } from '../focusItems';
import {
    BREAK_DEFAULT_MINUTES,
    WORK_DEFAULT_MINUTES,
    clampCycleMinutes,
    formatRemaining,
    nextCycleKind,
    remainingMs,
    suggestedMinutes,
    timerStatus,
    type FocusTimer,
} from '../pomodoro';

const item = (startTime?: string, endTime?: string): FocusItem =>
    ({ groupId: 'g', type: 'habit', itemId: 'h', sectionName: 'S', startTime, endTime } as FocusItem);

const NOW = 1_800_000_000_000;
const timer = (over: Partial<FocusTimer> = {}): FocusTimer => ({
    groupId: 'g',
    kind: 'work',
    endsAt: NOW + 60_000,
    pausedRemainingMs: null,
    durationMinutes: 25,
    completedCycles: 0,
    finished: false,
    date: '2026-08-28',
    ...over,
});

describe('suggestedMinutes', () => {
    it('reads the duration off the item\'s own window', () => {
        // The discovery this phase rests on: routine ITEMS carry startTime and endTime, so
        // every scheduled item already says how long its owner meant it to take. Neither Task
        // nor Habit needs a duration field.
        expect(suggestedMinutes(item('07:00', '07:45'))).toBe(45);
        expect(suggestedMinutes(item('14:00', '14:20'))).toBe(20);
    });

    it('handles a window that crosses midnight', () => {
        expect(suggestedMinutes(item('23:30', '00:15'))).toBe(45);
    });

    it('falls back to the classic 25 when there is nothing to read', () => {
        // Every item of a LIST routine takes this path, which is why it is a fallback and not
        // an error.
        expect(suggestedMinutes(item())).toBe(WORK_DEFAULT_MINUTES);
        expect(suggestedMinutes(item('07:00'))).toBe(WORK_DEFAULT_MINUTES);
        expect(suggestedMinutes(null)).toBe(WORK_DEFAULT_MINUTES);
        expect(suggestedMinutes(item('not-a-time', 'nor-this'))).toBe(WORK_DEFAULT_MINUTES);
    });

    it('falls back rather than returning zero for a zero-length window', () => {
        expect(suggestedMinutes(item('07:00', '07:00'))).toBe(WORK_DEFAULT_MINUTES);
    });

    it('clamps a window longer than the ceiling', () => {
        expect(suggestedMinutes(item('06:00', '18:00'))).toBe(180);
    });
});

describe('clampCycleMinutes', () => {
    it('bounds a typo without policing how anyone works', () => {
        expect(clampCycleMinutes(300)).toBe(180);
        expect(clampCycleMinutes(0)).toBe(1);
        expect(clampCycleMinutes(-5)).toBe(1);
        expect(clampCycleMinutes(25)).toBe(25);
        expect(clampCycleMinutes(25.6)).toBe(26);
    });

    it('gives the default for a value that is not a number at all', () => {
        expect(clampCycleMinutes(Number.NaN)).toBe(WORK_DEFAULT_MINUTES);
        expect(clampCycleMinutes(Number.POSITIVE_INFINITY)).toBe(WORK_DEFAULT_MINUTES);
    });
});

describe('remainingMs', () => {
    it('subtracts from the wall clock while running', () => {
        expect(remainingMs(timer({ endsAt: NOW + 90_000 }), NOW)).toBe(90_000);
    });

    it('floors at zero rather than going negative', () => {
        expect(remainingMs(timer({ endsAt: NOW - 5_000 }), NOW)).toBe(0);
    });

    it('reads the frozen remainder while paused, ignoring how long the pause lasted', () => {
        const paused = timer({ endsAt: NOW - 10 * 60_000, pausedRemainingMs: 120_000 });

        expect(remainingMs(paused, NOW)).toBe(120_000);
    });

    it('is zero with no timer', () => {
        expect(remainingMs(null, NOW)).toBe(0);
    });
});

describe('timerStatus', () => {
    it('names the four states, and none of them is a failure', () => {
        expect(timerStatus(null, NOW)).toBe('idle');
        expect(timerStatus(timer({ endsAt: NOW + 1_000 }), NOW)).toBe('running');
        expect(timerStatus(timer({ pausedRemainingMs: 1_000 }), NOW)).toBe('paused');
        // "elapsed", not "expired" or "failed": a cycle that ran out is a cycle that ran.
        expect(timerStatus(timer({ endsAt: NOW - 1 }), NOW)).toBe('elapsed');
    });

    it('a finished cycle reports elapsed, whatever is parked in the other fields', () => {
        // The bug this replaced: the completed action left a 0 in `pausedRemainingMs`, the
        // pause branch matched first, and a finished cycle showed the pause controls while the
        // "cycle finished" panel never appeared.
        const done = timer({ endsAt: 0, pausedRemainingMs: null, finished: true });

        expect(timerStatus(done, NOW)).toBe('elapsed');
        expect(remainingMs(done, NOW)).toBe(0);
    });

    it('stays elapsed even if something later marks a finished cycle paused', () => {
        // Not a state the reducer produces today. It pins the branch ORDER, which is the shape
        // the previous version got wrong.
        const both = timer({ finished: true, pausedRemainingMs: 60_000 });

        expect(timerStatus(both, NOW)).toBe('elapsed');
    });

    it('reads paused even when the stale end time is in the past', () => {
        const paused = timer({ endsAt: NOW - 10 * 60_000, pausedRemainingMs: 60_000 });

        expect(timerStatus(paused, NOW)).toBe('paused');
    });
});

describe('formatRemaining', () => {
    it('counts in minutes and seconds', () => {
        expect(formatRemaining(25 * 60_000)).toBe('25:00');
        expect(formatRemaining(61_000)).toBe('1:01');
        expect(formatRemaining(0)).toBe('0:00');
    });

    it('rounds UP, so a fresh 25 minute cycle never opens at 24:59', () => {
        expect(formatRemaining(24 * 60_000 + 59_500)).toBe('25:00');
    });

    it('never shows a negative time', () => {
        expect(formatRemaining(-5_000)).toBe('0:00');
    });

    it('grows an hours field once a cycle runs past the hour', () => {
        expect(formatRemaining(64 * 60_000)).toBe('1:04:00');
    });
});

describe('nextCycleKind', () => {
    it('work pays a break and a break pays work', () => {
        expect(nextCycleKind('work')).toBe('break');
        expect(nextCycleKind('break')).toBe('work');
        expect(BREAK_DEFAULT_MINUTES).toBeLessThan(WORK_DEFAULT_MINUTES);
    });
});
