import { describe, expect, it } from 'vitest';
import type { DailyBriefing, BriefingOpenItem } from '@beyou/types/briefing/briefing';
import {
    shouldOpenBriefing,
    resolveOpenItem,
    allOpenItems,
    recoveryIsUrgent,
} from './briefingRules';

/**
 * The gate and the optimistic update.
 *
 * Both are shared precisely because they are the parts that would drift between web and
 * mobile, so the tests read as statements about the product rather than about a function.
 */

const item = (id: string, date = '2026-09-12'): BriefingOpenItem => ({
    snapshotCheckId: id,
    snapshotId: 'snap-' + id,
    date,
    routineId: 'routine',
    routineName: 'Morning',
    itemType: 'HABIT',
    itemName: 'Item ' + id,
    itemIconId: 'icon',
    sectionName: 'Warm-up',
    xpIfCheckedNow: 8,
});

const briefing = (over: Partial<DailyBriefing> = {}): DailyBriefing => ({
    date: '2026-09-13',
    yesterday: {
        date: '2026-09-12',
        hadRoutine: true,
        complete: false,
        doneCount: 1,
        skippedCount: 0,
        xpEarned: 20,
        openItems: [item('a'), item('b')],
        focusCycles: 0,
        moodLevel: null,
    },
    today: {
        scheduledItemCount: 4,
        scheduledToday: true,
        currentStreak: 3,
        bestStreak: 9,
        goalsApproaching: [],
        recovery: null,
    },
    narrative: { status: 'READY', todayLines: ['a'], yesterdayLines: ['b'] },
    seenAt: null,
    ...over,
});

describe('shouldOpenBriefing', () => {
    it('opens on a morning with something to say', () => {
        expect(shouldOpenBriefing({ briefing: briefing() })).toBe(true);
    });

    /** The reason seenAt is a server column and not localStorage. */
    it('stays closed once the server says it was seen', () => {
        expect(shouldOpenBriefing({ briefing: briefing({ seenAt: '2026-09-13T07:00:00Z' }) }))
            .toBe(false);
    });

    /**
     * An account with no yesterday and nothing on today gets silence. A dialog that says
     * "nothing happened" every morning is one people learn to close unread.
     */
    it('stays closed when there is nothing to say', () => {
        const empty = briefing({
            yesterday: {
                date: '2026-09-12', hadRoutine: false, complete: false, doneCount: 0,
                skippedCount: 0, xpEarned: 0, openItems: [], focusCycles: 0, moodLevel: null,
            },
            today: {
                scheduledItemCount: 0, scheduledToday: false, currentStreak: 0,
                bestStreak: 0, goalsApproaching: [], recovery: null,
            },
        });
        expect(shouldOpenBriefing({ briefing: empty })).toBe(false);
    });

    /** Finishing a day is the good outcome and it earns the dialog. */
    it('opens on a finished yesterday with nothing left open', () => {
        const finished = briefing({
            yesterday: {
                date: '2026-09-12', hadRoutine: true, complete: true, doneCount: 5,
                skippedCount: 0, xpEarned: 60, openItems: [], focusCycles: 2, moodLevel: 4,
            },
        });
        expect(shouldOpenBriefing({ briefing: finished })).toBe(true);
    });

    it('yields to the tutorial', () => {
        expect(shouldOpenBriefing({ briefing: briefing(), tutorialActive: true })).toBe(false);
    });

    /** The dashboard refetches on focus; a dismissal must not be undone by that. */
    it('does not reopen after the user closed it in this session', () => {
        expect(shouldOpenBriefing({ briefing: briefing(), dismissedThisSession: true }))
            .toBe(false);
    });

    it('handles no briefing at all', () => {
        expect(shouldOpenBriefing({ briefing: null })).toBe(false);
    });
});

describe('resolveOpenItem', () => {
    it('removes the item and moves the done count', () => {
        const after = resolveOpenItem(briefing(), 'a', 'checked');

        expect(after.yesterday.openItems.map((i) => i.snapshotCheckId)).toEqual(['b']);
        expect(after.yesterday.doneCount).toBe(2);
        expect(after.yesterday.skippedCount).toBe(0);
    });

    it('counts a skip as a skip and not as a check', () => {
        const after = resolveOpenItem(briefing(), 'a', 'skipped');

        expect(after.yesterday.doneCount).toBe(1);
        expect(after.yesterday.skippedCount).toBe(1);
    });

    /** The caller should not have to know which list the row was in. */
    it('reaches into the older-days list too', () => {
        const withRecovery = briefing({
            today: {
                ...briefing().today,
                recovery: {
                    oldestOpenDay: '2026-09-07',
                    daysUntilExpiry: 2,
                    remainingXpPercent: 20,
                    openItems: [item('old', '2026-09-07'), item('older', '2026-09-08')],
                },
            },
        });

        const after = resolveOpenItem(withRecovery, 'old', 'checked');

        expect(after.today.recovery?.openItems.map((i) => i.snapshotCheckId)).toEqual(['older']);
        // Yesterday's counts are untouched: the row was not from yesterday.
        expect(after.yesterday.doneCount).toBe(1);
    });

    /** An emptied window loses the affordance rather than collapsing to an empty accordion. */
    it('drops the recovery window once its last item is resolved', () => {
        const withRecovery = briefing({
            today: {
                ...briefing().today,
                recovery: {
                    oldestOpenDay: '2026-09-07',
                    daysUntilExpiry: 1,
                    remainingXpPercent: 20,
                    openItems: [item('only', '2026-09-07')],
                },
            },
        });

        expect(resolveOpenItem(withRecovery, 'only', 'checked').today.recovery).toBeNull();
    });

    it('returns the same object when nothing matched', () => {
        const original = briefing();
        expect(resolveOpenItem(original, 'missing', 'checked')).toBe(original);
    });
});

describe('allOpenItems', () => {
    it('puts yesterday ahead of the older days', () => {
        const withRecovery = briefing({
            today: {
                ...briefing().today,
                recovery: {
                    oldestOpenDay: '2026-09-07',
                    daysUntilExpiry: 3,
                    remainingXpPercent: 40,
                    openItems: [item('old', '2026-09-07')],
                },
            },
        });

        expect(allOpenItems(withRecovery).map((i) => i.snapshotCheckId))
            .toEqual(['a', 'b', 'old']);
    });
});

describe('recoveryIsUrgent', () => {
    /** One day left means tonight. Anything longer is information, not a deadline. */
    it('is urgent only on the last night', () => {
        const at = (days: number) =>
            recoveryIsUrgent(briefing({
                today: {
                    ...briefing().today,
                    recovery: {
                        oldestOpenDay: '2026-09-07',
                        daysUntilExpiry: days,
                        remainingXpPercent: 20,
                        openItems: [item('old', '2026-09-07')],
                    },
                },
            }));

        expect(at(1)).toBe(true);
        expect(at(2)).toBe(false);
    });

    it('is never urgent with no window', () => {
        expect(recoveryIsUrgent(briefing())).toBe(false);
    });
});

/**
 * A briefing whose shape is not what the types promise.
 *
 * Not a hypothetical: the dialog is gated from inside the dashboard's render, so a response
 * that does not deserialize the way this expects used to throw through the dashboard itself
 * and leave the user with a blank home screen. A briefing that cannot be understood is a
 * briefing not worth showing.
 */
describe('malformed responses', () => {
    const broken = { date: '2026-09-13' } as unknown as DailyBriefing;

    it('does not open, and does not throw', () => {
        expect(() => shouldOpenBriefing({ briefing: broken })).not.toThrow();
        expect(shouldOpenBriefing({ briefing: broken })).toBe(false);
    });

    it('survives the readers too', () => {
        expect(allOpenItems(broken)).toEqual([]);
        expect(recoveryIsUrgent(broken)).toBe(false);
        expect(resolveOpenItem(broken, 'anything', 'checked')).toBe(broken);
    });
});
