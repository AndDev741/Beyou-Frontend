import { describe, expect, it } from 'vitest';
import type { MoodEntry, MoodLevel } from '@beyou/types/mood/mood';
import {
    addDays,
    averageMood,
    journalStreak,
    monthGrid,
    monthRange,
    moodLabelKey,
    nearestLevel,
    weekEnding,
} from './moodStats';

const entry = (date: string, mood: MoodLevel, note: string | null = null): MoodEntry => ({
    id: `id-${date}`,
    date,
    mood,
    note,
    updatedAt: `${date}T12:00:00Z`,
});

describe('addDays', () => {
    it('moves forward and back within a month', () => {
        expect(addDays('2026-09-06', 1)).toBe('2026-09-07');
        expect(addDays('2026-09-06', -6)).toBe('2026-08-31');
    });

    it('crosses a year boundary', () => {
        expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
        expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    });

    it('handles a leap day', () => {
        expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    });

    /**
     * The regression this function exists for. `new Date('2026-09-06')` is midnight UTC, so
     * adding days through a local-time Date shifts the answer by one for anyone west of
     * Greenwich — and these strings are already the user's own day.
     */
    it('is stable regardless of the machine offset', () => {
        expect(addDays('2026-09-06', 0)).toBe('2026-09-06');
        expect(addDays('2026-01-01', 0)).toBe('2026-01-01');
    });
});

describe('weekEnding', () => {
    it('returns seven days, oldest first, ending on the day given', () => {
        expect(weekEnding('2026-09-06')).toEqual([
            '2026-08-31',
            '2026-09-01',
            '2026-09-02',
            '2026-09-03',
            '2026-09-04',
            '2026-09-05',
            '2026-09-06',
        ]);
    });
});

describe('journalStreak', () => {
    it('counts consecutive days back from today', () => {
        const entries = [entry('2026-09-06', 4), entry('2026-09-05', 3), entry('2026-09-04', 5)];
        expect(journalStreak(entries, '2026-09-06')).toBe(3);
    });

    it('stops at the first missing day', () => {
        const entries = [entry('2026-09-06', 4), entry('2026-09-04', 5)];
        expect(journalStreak(entries, '2026-09-06')).toBe(1);
    });

    /**
     * The kindness rule: somebody who journalled for thirty days and has not opened the app
     * before lunch still has thirty days. Telling them the run is over at 09:00 would be both
     * wrong and mean.
     */
    it('keeps yesterday-anchored runs alive when today is not recorded yet', () => {
        const entries = [entry('2026-09-05', 3), entry('2026-09-04', 4), entry('2026-09-03', 2)];
        expect(journalStreak(entries, '2026-09-06')).toBe(3);
    });

    it('is zero when neither today nor yesterday was recorded', () => {
        expect(journalStreak([entry('2026-09-01', 3)], '2026-09-06')).toBe(0);
    });

    it('is zero with no entries at all', () => {
        expect(journalStreak([], '2026-09-06')).toBe(0);
    });
});

describe('averageMood', () => {
    it('is null with nothing to average', () => {
        expect(averageMood([])).toBeNull();
    });

    it('rounds to one decimal', () => {
        const entries = [entry('2026-09-06', 5), entry('2026-09-05', 4), entry('2026-09-04', 4)];
        expect(averageMood(entries)).toBe(4.3);
    });
});

describe('nearestLevel', () => {
    it('rounds to the closest face', () => {
        expect(nearestLevel(4.3)).toBe(4);
        expect(nearestLevel(4.6)).toBe(5);
    });

    it('clamps outside the scale rather than producing a face that does not exist', () => {
        expect(nearestLevel(0.2)).toBe(1);
        expect(nearestLevel(9)).toBe(5);
    });
});

describe('monthRange', () => {
    it('spans the first to the last day', () => {
        expect(monthRange(2026, 8)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    });

    it('gets February right in a leap year', () => {
        expect(monthRange(2028, 1)).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    });
});

describe('monthGrid', () => {
    it('pads to whole weeks starting on Sunday', () => {
        const cells = monthGrid(2026, 8); // September 2026 starts on a Tuesday
        expect(cells.length % 7).toBe(0);
        expect(cells[0]).toBeNull();
        expect(cells[1]).toBeNull();
        expect(cells[2]).toBe('2026-09-01');
        expect(cells.filter((cell) => cell !== null)).toHaveLength(30);
    });

    it('needs no leading padding when the month starts on a Sunday', () => {
        const cells = monthGrid(2026, 10); // November 2026 starts on a Sunday
        expect(cells[0]).toBe('2026-11-01');
    });
});

describe('moodLabelKey', () => {
    it('names a key per level so both clients label a face identically', () => {
        expect(moodLabelKey(1)).toBe('MoodLevel1');
        expect(moodLabelKey(5)).toBe('MoodLevel5');
    });
});
