import type { SecondBrainArea } from '@beyou/types/secondBrain/secondBrain';
import {
    SECOND_BRAIN_REFILL_EVERY_MS,
    canActOnAnswer,
    secondBrainAreaEnds,
    secondBrainRefillIsDue,
    secondBrainSourceEnabled,
} from './secondBrainRules';

const area = (categoryId: string, percent: number | null): SecondBrainArea => ({
    categoryId,
    name: categoryId,
    iconId: null,
    asked: 10,
    checked: percent == null ? 0 : Math.round(percent / 10),
    percent,
});

describe('secondBrainAreaEnds', () => {
    it('names the first and the last category that have a percentage', () => {
        expect(secondBrainAreaEnds([area('health', 83), area('work', 50), area('study', 30), area('new', null)]))
            .toEqual({ strongestId: 'health', weakestId: 'study' });
    });

    /** One category, or every category level, has no two ends to tell apart. */
    it('names nothing without two different ends', () => {
        expect(secondBrainAreaEnds([area('health', 83)])).toBeNull();
        expect(secondBrainAreaEnds([area('health', 0), area('work', 0)])).toBeNull();
        expect(secondBrainAreaEnds([area('health', 60), area('new', null)])).toBeNull();
        expect(secondBrainAreaEnds([])).toBeNull();
    });
});

describe('secondBrainRefillIsDue', () => {
    const now = 1_800_000_000_000;

    it('always asks for an empty list, however recently it asked', () => {
        expect(secondBrainRefillIsDue(0, now - 1000, now)).toBe(true);
    });

    it('never asks for a full list', () => {
        expect(secondBrainRefillIsDue(5, null, now)).toBe(false);
    });

    it('asks again only after the pause', () => {
        expect(secondBrainRefillIsDue(2, null, now)).toBe(true);
        expect(secondBrainRefillIsDue(2, now - SECOND_BRAIN_REFILL_EVERY_MS, now)).toBe(false);
        expect(secondBrainRefillIsDue(2, now - SECOND_BRAIN_REFILL_EVERY_MS - 1, now)).toBe(true);
    });
});

describe('answers and sources', () => {
    /** A profile answer is the fact itself. The others may call for something done in the app. */
    it('hands only check-ins and follow-ups to the assistant', () => {
        expect(canActOnAnswer('CHECK_IN')).toBe(true);
        expect(canActOnAnswer('FOLLOW_UP')).toBe(true);
        expect(canActOnAnswer('PROFILE_OBJECTIVES')).toBe(false);
        expect(canActOnAnswer('PROFILE_LIKES')).toBe(false);
        expect(canActOnAnswer('PROFILE_ABOUT')).toBe(false);
    });

    it('reads a source the list does not carry as off', () => {
        const sources = [{ source: 'GOALS' as const, enabled: true }, { source: 'CALENDAR' as const, enabled: false }];
        expect(secondBrainSourceEnabled(sources, 'GOALS')).toBe(true);
        expect(secondBrainSourceEnabled(sources, 'CALENDAR')).toBe(false);
        expect(secondBrainSourceEnabled(sources, 'IDEAS')).toBe(false);
    });
});
