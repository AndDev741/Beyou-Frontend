import { describe, it, expect } from 'vitest';
import { RoutineSection } from '@beyou/types/routine/routineSection';
import { suggestSlots } from './suggestSlots';

const section = (overrides: Partial<RoutineSection> = {}): RoutineSection =>
    ({
        id: 's1',
        name: 'Morning',
        iconId: '',
        startTime: '08:00',
        endTime: '09:00',
        order: 0,
        habitGroup: [],
        taskGroup: [],
        ...overrides,
    }) as RoutineSection;

describe('suggestSlots', () => {
    it('gives a lone item the default 15 minute slice at the start of the window', () => {
        expect(suggestSlots(section(), 1)).toEqual([{ startTime: '08:00', endTime: '08:15' }]);
    });

    it('splits the window when several items come in together', () => {
        expect(suggestSlots(section(), 2)).toEqual([
            { startTime: '08:00', endTime: '08:30' },
            { startTime: '08:30', endTime: '09:00' },
        ]);
    });

    it('resumes after the items already in the section', () => {
        const withItem = section({
            habitGroup: [{ habitId: 'h1', startTime: '08:00', endTime: '08:20' }] as never,
        });

        expect(suggestSlots(withItem, 1)).toEqual([{ startTime: '08:20', endTime: '08:35' }]);
    });

    it('falls back to 15 minute slices when the section has no end', () => {
        expect(suggestSlots(section({ endTime: '' }), 2)).toEqual([
            { startTime: '08:00', endTime: '08:15' },
            { startTime: '08:15', endTime: '08:30' },
        ]);
    });

    /**
     * An item running past the section end left the cursor beyond it. Only the
     * end was clamped, so the suggestion came out backwards — 09:10 to 09:00.
     */
    it('suggests nothing when an existing item already overflows the window', () => {
        const overflowing = section({
            habitGroup: [{ habitId: 'h1', startTime: '08:40', endTime: '09:10' }] as never,
        });

        expect(suggestSlots(overflowing, 1)).toEqual([]);
    });

    it('suggests nothing when the window is exactly full', () => {
        const full = section({
            habitGroup: [{ habitId: 'h1', startTime: '08:00', endTime: '09:00' }] as never,
        });

        expect(suggestSlots(full, 1)).toEqual([]);
    });

    /** An overnight section wraps past midnight; the window is still finite. */
    it('handles an overnight window', () => {
        const overnight = section({ startTime: '23:00', endTime: '01:00' });

        expect(suggestSlots(overnight, 2)).toEqual([
            { startTime: '23:00', endTime: '00:00' },
            { startTime: '00:00', endTime: '01:00' },
        ]);
    });

    it('suggests nothing for a non-positive count', () => {
        expect(suggestSlots(section(), 0)).toEqual([]);
    });
});
