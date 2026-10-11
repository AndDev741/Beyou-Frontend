import { describe, expect, it } from 'vitest';
import type { CalendarOverview, CalendarTask } from '@beyou/types/calendar/calendar';
import {
    dayFromOverview,
    hourOf,
    isInMonth,
    monthGridDays,
    rangeForView,
    removeTaskFromOverview,
    shiftMonth,
    sortCalendarTasks,
    splitTasksByTime,
    upsertTaskInOverview,
    weekDaysOf,
} from './calendarDates';

const task = (overrides: Partial<CalendarTask>): CalendarTask => ({
    id: 't1',
    title: 'Sign the lease',
    note: null,
    date: '2026-10-14',
    time: null,
    advanceMinutes: 0,
    completed: false,
    completedAt: null,
    xpAwarded: 0,
    notifyAt: '2026-10-14T12:00:00Z',
    ...overrides,
});

const overview = (days: string[]): CalendarOverview => ({
    from: days[0],
    to: days[days.length - 1],
    today: days[0],
    days: days.map((date) => ({ date, tasks: [], routines: [], goals: [], mood: null })),
});

describe('monthGridDays', () => {
    it('pads October 2026 to whole Sunday-first weeks with real neighbouring days', () => {
        const days = monthGridDays({ year: 2026, monthIndex: 9 });
        // 1 October 2026 is a Thursday, 31 October a Saturday.
        expect(days[0]).toBe('2026-09-27');
        expect(days[days.length - 1]).toBe('2026-10-31');
        expect(days).toHaveLength(35);
    });

    it('crosses the year boundary', () => {
        const days = monthGridDays({ year: 2026, monthIndex: 11 });
        expect(days[0]).toBe('2026-11-29');
        expect(days[days.length - 1]).toBe('2027-01-02');
    });

    it('never spans more days than the API accepts', () => {
        for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
            expect(monthGridDays({ year: 2027, monthIndex }).length).toBeLessThanOrEqual(42);
        }
    });
});

describe('weeks and months', () => {
    it('gives the Sunday-to-Saturday week of a day', () => {
        expect(weekDaysOf('2026-10-14')).toEqual([
            '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14',
            '2026-10-15', '2026-10-16', '2026-10-17',
        ]);
    });

    it('builds the request range for each view', () => {
        expect(rangeForView('week', '2026-10-14')).toEqual({ from: '2026-10-11', to: '2026-10-17' });
        expect(rangeForView('month', '2026-10-14')).toEqual({ from: '2026-09-27', to: '2026-10-31' });
    });

    it('shifts months across years both ways', () => {
        expect(shiftMonth({ year: 2026, monthIndex: 11 }, 1)).toEqual({ year: 2027, monthIndex: 0 });
        expect(shiftMonth({ year: 2026, monthIndex: 0 }, -1)).toEqual({ year: 2025, monthIndex: 11 });
    });

    it('tells padding days apart from the month', () => {
        expect(isInMonth('2026-09-30', { year: 2026, monthIndex: 9 })).toBe(false);
        expect(isInMonth('2026-10-01', { year: 2026, monthIndex: 9 })).toBe(true);
    });
});

describe('task ordering', () => {
    it('puts timed tasks first by time and keeps untimed ones in order', () => {
        const sorted = sortCalendarTasks([
            task({ id: 'a' }),
            task({ id: 'b', time: '15:00' }),
            task({ id: 'c' }),
            task({ id: 'd', time: '09:30' }),
        ]);
        expect(sorted.map((t) => t.id)).toEqual(['d', 'b', 'a', 'c']);
    });

    it('splits a day for the week view', () => {
        const { timed, untimed } = splitTasksByTime([task({ id: 'a' }), task({ id: 'b', time: '08:00' })]);
        expect(timed.map((t) => t.id)).toEqual(['b']);
        expect(untimed.map((t) => t.id)).toEqual(['a']);
    });

    it('reads the hour of a time', () => {
        expect(hourOf('09:45')).toBe(9);
        expect(hourOf('23:59')).toBe(23);
    });
});

describe('overview bookkeeping', () => {
    it('moves an edited task to its new day', () => {
        let state = overview(['2026-10-14', '2026-10-15']);
        state = upsertTaskInOverview(state, task({ id: 'x', date: '2026-10-14' }));
        state = upsertTaskInOverview(state, task({ id: 'x', date: '2026-10-15', title: 'Moved' }));
        expect(dayFromOverview(state, '2026-10-14').tasks).toEqual([]);
        expect(dayFromOverview(state, '2026-10-15').tasks.map((t) => t.title)).toEqual(['Moved']);
    });

    it('drops a task moved outside the range', () => {
        let state = overview(['2026-10-14']);
        state = upsertTaskInOverview(state, task({ id: 'x' }));
        state = upsertTaskInOverview(state, task({ id: 'x', date: '2026-12-01' }));
        expect(dayFromOverview(state, '2026-10-14').tasks).toEqual([]);
    });

    it('removes a deleted task', () => {
        let state = overview(['2026-10-14']);
        state = upsertTaskInOverview(state, task({ id: 'x' }));
        state = removeTaskFromOverview(state, 'x');
        expect(dayFromOverview(state, '2026-10-14').tasks).toEqual([]);
    });

    it('answers an empty day for a date outside the overview', () => {
        expect(dayFromOverview(null, '2026-10-14')).toEqual({
            date: '2026-10-14', tasks: [], routines: [], goals: [], mood: null,
        });
    });
});
