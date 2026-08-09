import { describe, it, expect } from 'vitest';
import { parseLocalDate } from './parseLocalDate';

/**
 * Written to hold in ANY timezone: pinning TZ in the vitest config does not
 * reach the worker's `Date`, so the assertions carry the invariant themselves.
 * Run them under `TZ=America/Sao_Paulo` to see the bug they guard: there, a
 * UTC-parsed `yyyy-MM-dd` lands on the previous day.
 */
describe('parseLocalDate', () => {
    it('keeps the calendar day of a date-only string in the local zone', () => {
        const parsed = parseLocalDate('2026-08-21');

        expect(parsed?.getFullYear()).toBe(2026);
        expect(parsed?.getMonth()).toBe(7);
        expect(parsed?.getDate()).toBe(21);
    });

    it('keeps the day where a UTC parse would shift it', () => {
        // The bug this exists to prevent: `new Date("2026-08-21")` is UTC
        // midnight, which is the 20th at 21:00 in São Paulo. West of UTC the
        // two disagree; anywhere else they match — and our answer is right in
        // both cases.
        const utcParsed = new Date('2026-08-21');
        const local = parseLocalDate('2026-08-21');

        expect(local?.getDate()).toBe(21);
        if (utcParsed.getTimezoneOffset() > 0) {
            expect(utcParsed.getDate()).toBe(20);
        }
    });

    it('leaves a value that already carries a time to the platform parser', () => {
        const withTime = parseLocalDate('2026-08-21T23:30:00');

        expect(withTime?.getDate()).toBe(21);
        expect(withTime?.getHours()).toBe(23);
    });

    it('passes a Date through untouched', () => {
        const date = new Date(2026, 7, 21, 9, 0, 0);

        expect(parseLocalDate(date)).toBe(date);
    });

    it('returns null for empty and unparseable values', () => {
        expect(parseLocalDate('')).toBeNull();
        expect(parseLocalDate(null)).toBeNull();
        expect(parseLocalDate(undefined)).toBeNull();
        expect(parseLocalDate('not a date')).toBeNull();
        expect(parseLocalDate(new Date('nope'))).toBeNull();
    });
});
