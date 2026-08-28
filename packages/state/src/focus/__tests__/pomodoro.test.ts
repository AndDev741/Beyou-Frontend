import { describe, expect, it } from 'vitest';
import type { FocusItem } from '../focusItems';
import {
    DEFAULT_POMODORO_SETTINGS,
    clampCycleMinutes,
    clampLongBreakEvery,
    cycleMinutes,
    formatRemaining,
    itemWindowMinutes,
    nextCycleKind,
    pomodoroNumber,
    remainingMs,
    timerStatus,
    type FocusTimer,
    type PomodoroSettings,
} from '../pomodoro';

const item = (startTime?: string, endTime?: string): FocusItem =>
    ({ groupId: 'g', type: 'habit', itemId: 'h', sectionName: 'S', startTime, endTime } as FocusItem);

const settings = (over: Partial<PomodoroSettings> = {}): PomodoroSettings => ({
    ...DEFAULT_POMODORO_SETTINGS,
    ...over,
});

const NOW = 1_800_000_000_000;
const timer = (over: Partial<FocusTimer> = {}): FocusTimer => ({
    groupId: 'g',
    kind: 'pomodoro',
    endsAt: NOW + 60_000,
    pausedRemainingMs: null,
    durationMinutes: 25,
    completedCycles: 0,
    finished: false,
    date: '2026-08-28',
    ...over,
});

describe('cycleMinutes', () => {
    it("takes a pomodoro's length from the item's own window", () => {
        // The discovery this phase rests on: routine ITEMS carry startTime and endTime, so every
        // scheduled item already says how long its owner meant it to take. Neither Task nor
        // Habit needs a duration field.
        expect(cycleMinutes('pomodoro', item('07:00', '07:45'), settings())).toBe(45);
        expect(cycleMinutes('pomodoro', item('14:00', '14:20'), settings())).toBe(20);
    });

    it('falls back to the configured pomodoro length when the item has no window', () => {
        // Every item of a LIST routine takes this path, which is why it is a fallback and not
        // an error.
        expect(cycleMinutes('pomodoro', item(), settings())).toBe(25);
        expect(cycleMinutes('pomodoro', item(), settings({ pomodoro: 50 }))).toBe(50);
        expect(cycleMinutes('pomodoro', null, settings({ pomodoro: 30 }))).toBe(30);
    });

    it("ignores the item's window for a break, because a rest has its own length", () => {
        const long = item('07:00', '08:30');

        expect(cycleMinutes('shortBreak', long, settings())).toBe(5);
        expect(cycleMinutes('longBreak', long, settings())).toBe(15);
        expect(cycleMinutes('shortBreak', long, settings({ shortBreak: 7 }))).toBe(7);
    });

    it('clamps whatever it returns', () => {
        expect(cycleMinutes('pomodoro', item('06:00', '18:00'), settings())).toBe(180);
        expect(cycleMinutes('longBreak', item(), settings({ longBreak: 999 }))).toBe(180);
        expect(cycleMinutes('shortBreak', item(), settings({ shortBreak: 0 }))).toBe(1);
    });
});

describe('itemWindowMinutes', () => {
    it('handles a window that crosses midnight', () => {
        expect(itemWindowMinutes(item('23:30', '00:15'))).toBe(45);
    });

    it('is null when there is nothing readable to measure', () => {
        expect(itemWindowMinutes(item())).toBeNull();
        expect(itemWindowMinutes(item('07:00'))).toBeNull();
        expect(itemWindowMinutes(item('07:00', '07:00'))).toBeNull();
        expect(itemWindowMinutes(item('not-a-time', 'nor-this'))).toBeNull();
        expect(itemWindowMinutes(null)).toBeNull();
    });
});

describe('clamping', () => {
    it('bounds a typed duration without policing how anyone works', () => {
        expect(clampCycleMinutes(300)).toBe(180);
        expect(clampCycleMinutes(0)).toBe(1);
        expect(clampCycleMinutes(-5)).toBe(1);
        expect(clampCycleMinutes(25.6)).toBe(26);
        expect(clampCycleMinutes(Number.NaN)).toBe(DEFAULT_POMODORO_SETTINGS.pomodoro);
    });

    it('bounds how often the long break comes round', () => {
        expect(clampLongBreakEvery(0)).toBe(1);
        expect(clampLongBreakEvery(99)).toBe(12);
        expect(clampLongBreakEvery(4)).toBe(4);
        expect(clampLongBreakEvery(Number.NaN)).toBe(DEFAULT_POMODORO_SETTINGS.longBreakEvery);
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

    it('is zero with no timer, and zero once finished', () => {
        expect(remainingMs(null, NOW)).toBe(0);
        expect(remainingMs(timer({ finished: true, endsAt: NOW + 60_000 }), NOW)).toBe(0);
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

    it('stays elapsed even if something later marks a finished cycle paused', () => {
        // Not a state the reducer produces today. It pins the branch ORDER, which is the shape
        // the previous version got wrong: a 0 parked in `pausedRemainingMs` matched the pause
        // branch first, and the "cycle finished" panel never appeared at all.
        expect(timerStatus(timer({ finished: true, pausedRemainingMs: 60_000 }), NOW)).toBe(
            'elapsed',
        );
    });

    it('reads paused even when the stale end time is in the past', () => {
        const paused = timer({ endsAt: NOW - 10 * 60_000, pausedRemainingMs: 60_000 });

        expect(timerStatus(paused, NOW)).toBe('paused');
    });
});

describe('formatRemaining', () => {
    it('counts in zero-padded minutes and seconds', () => {
        // Padded because the number renders at 64px: a display that changes width between
        // "9:59" and "10:00" shifts the whole card sideways every ten minutes.
        expect(formatRemaining(25 * 60_000)).toBe('25:00');
        expect(formatRemaining(61_000)).toBe('01:01');
        expect(formatRemaining(0)).toBe('00:00');
    });

    it('rounds UP, so a fresh 25 minute cycle never opens at 24:59', () => {
        expect(formatRemaining(24 * 60_000 + 59_500)).toBe('25:00');
    });

    it('never shows a negative time', () => {
        expect(formatRemaining(-5_000)).toBe('00:00');
    });

    it('grows an hours field once a cycle runs past the hour', () => {
        expect(formatRemaining(64 * 60_000)).toBe('1:04:00');
    });
});

describe('nextCycleKind', () => {
    it('a pomodoro pays a short break, until the interval comes round', () => {
        expect(nextCycleKind('pomodoro', 1, 4)).toBe('shortBreak');
        expect(nextCycleKind('pomodoro', 2, 4)).toBe('shortBreak');
        expect(nextCycleKind('pomodoro', 3, 4)).toBe('shortBreak');
        expect(nextCycleKind('pomodoro', 4, 4)).toBe('longBreak');
        expect(nextCycleKind('pomodoro', 8, 4)).toBe('longBreak');
    });

    it('respects a configured interval, including every single one', () => {
        expect(nextCycleKind('pomodoro', 2, 2)).toBe('longBreak');
        expect(nextCycleKind('pomodoro', 1, 1)).toBe('longBreak');
        expect(nextCycleKind('pomodoro', 3, 5)).toBe('shortBreak');
    });

    it('any break pays a pomodoro', () => {
        expect(nextCycleKind('shortBreak', 4, 4)).toBe('pomodoro');
        expect(nextCycleKind('longBreak', 4, 4)).toBe('pomodoro');
    });

    it('clamps a nonsense interval rather than dividing by zero', () => {
        expect(nextCycleKind('pomodoro', 1, 0)).toBe('longBreak');
        expect(nextCycleKind('pomodoro', 1, Number.NaN)).toBe('shortBreak');
    });
});

describe('pomodoroNumber', () => {
    it('counts from one, so a fresh sitting reads #1', () => {
        expect(pomodoroNumber(0)).toBe(1);
        expect(pomodoroNumber(3)).toBe(4);
    });
});
