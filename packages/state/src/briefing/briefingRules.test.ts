import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
    DailyBriefing,
    BriefingGoal,
    BriefingNarrative,
    BriefingOpenItem,
} from '@beyou/types/briefing/briefing';
import {
    shouldOpenBriefing,
    resolveOpenItem,
    allOpenItems,
    groupOpenItemsByDay,
    recoveryIsUrgent,
    briefingGoals,
    pollNarrative,
    withNarrative,
    NARRATIVE_GAVE_UP,
    goalPaceMessage,
    showsExpectedPace,
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

const goal = (id: string): BriefingGoal => ({
    id,
    name: 'Goal ' + id,
    iconId: 'icon',
    currentValue: 2,
    targetValue: 10,
    unit: 'times',
    endDate: '2026-12-01',
    daysRemaining: 79,
    percentComplete: 20,
    remainingValue: 8,
    requiredPerDay: 0.1,
    expectedPercent: 30,
    pace: 'BEHIND',
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
        goalsAhead: [],
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
                bestStreak: 0, goalsApproaching: [], recovery: null, goalsAhead: [],
            },
        });
        expect(shouldOpenBriefing({ briefing: empty })).toBe(false);
    });

    /** A goal months out is still where the user is heading, so it earns the dialog. */
    it('opens on an open goal alone', () => {
        const onlyAGoal = briefing({
            yesterday: {
                date: '2026-09-12', hadRoutine: false, complete: false, doneCount: 0,
                skippedCount: 0, xpEarned: 0, openItems: [], focusCycles: 0, moodLevel: null,
            },
            today: {
                scheduledItemCount: 0, scheduledToday: false, currentStreak: 0,
                bestStreak: 0, goalsApproaching: [], recovery: null, goalsAhead: [goal('far')],
            },
        });
        expect(shouldOpenBriefing({ briefing: onlyAGoal })).toBe(true);
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

/**
 * The older-days list groups by day, and the reason is the whole point of the panel.
 *
 * A row reading "Morning, worth 3 XP" cannot be answered. "Did I do this?" is a question about
 * a DAY: people remember last Monday, not a habit floating free of one.
 */
describe('groupOpenItemsByDay', () => {
    it('groups by day, oldest first', () => {
        const groups = groupOpenItemsByDay([
            item('c', '2026-09-10'),
            item('a', '2026-09-08'),
            item('d', '2026-09-10'),
            item('b', '2026-09-09'),
        ]);

        expect(groups.map((g) => g.date)).toEqual(['2026-09-08', '2026-09-09', '2026-09-10']);
        expect(groups[2].items.map((i) => i.snapshotCheckId)).toEqual(['c', 'd']);
    });

    /** Within a day, the server's order is kept — it is already the routine's own order. */
    it('preserves the incoming order inside a day', () => {
        const groups = groupOpenItemsByDay([
            item('second', '2026-09-08'),
            item('first', '2026-09-08'),
        ]);

        expect(groups).toHaveLength(1);
        expect(groups[0].items.map((i) => i.snapshotCheckId)).toEqual(['second', 'first']);
    });

    it('handles an empty list', () => {
        expect(groupOpenItemsByDay([])).toEqual([]);
    });
});

/**
 * Asking for it back from the configuration screen.
 *
 * The suppressions exist to stop the dialog appearing UNASKED; this is the opposite, so it
 * beats them. It does not beat "nothing to say", because the honest answer to asking for an
 * empty briefing is nothing at all rather than an empty modal.
 */
describe('forceOpen', () => {
    it('reopens a briefing the server already marked seen', () => {
        const seen = briefing({ seenAt: '2026-09-13T07:00:00Z' });

        expect(shouldOpenBriefing({ briefing: seen })).toBe(false);
        expect(shouldOpenBriefing({ briefing: seen, forceOpen: true })).toBe(true);
    });

    it('reopens one closed earlier in this session', () => {
        expect(
            shouldOpenBriefing({ briefing: briefing(), dismissedThisSession: true, forceOpen: true }),
        ).toBe(true);
    });

    it('still shows nothing when there is nothing to show', () => {
        const empty = briefing({
            yesterday: {
                date: '2026-09-12', hadRoutine: false, complete: false, doneCount: 0,
                skippedCount: 0, xpEarned: 0, openItems: [], focusCycles: 0, moodLevel: null,
            },
            today: {
                scheduledItemCount: 0, scheduledToday: false, currentStreak: 0,
                bestStreak: 0, goalsApproaching: [], recovery: null, goalsAhead: [],
            },
        });

        expect(shouldOpenBriefing({ briefing: empty, forceOpen: true })).toBe(false);
    });

    /** The tutorial still wins: it owns the screen with its own overlay. */
    it('does not fight the tutorial', () => {
        expect(
            shouldOpenBriefing({ briefing: briefing(), tutorialActive: true, forceOpen: true }),
        ).toBe(false);
    });
});

describe('briefingGoals', () => {
    it('reads goalsAhead', () => {
        const b = briefing();
        b.today = { ...b.today, goalsAhead: [goal('ahead')], goalsApproaching: [goal('legacy')] };
        expect(briefingGoals(b).map((g) => g.id)).toEqual(['ahead']);
    });

    /** A new app build can meet a server that predates the field, for one deploy gap. */
    it('falls back to the legacy list from an older server', () => {
        const b = briefing();
        const { goalsAhead: _dropped, ...older } = { ...b.today, goalsApproaching: [goal('legacy')] };
        b.today = older as DailyBriefing['today'];
        expect(briefingGoals(b).map((g) => g.id)).toEqual(['legacy']);
    });
});

describe('withNarrative', () => {
    it('swaps the prose and keeps what the user changed meanwhile', () => {
        const resolved = resolveOpenItem(briefing(), 'a', 'checked');
        const ready: BriefingNarrative = { status: 'READY', todayLines: ['new'], yesterdayLines: [] };

        const next = withNarrative(resolved, ready);

        expect(next.narrative).toEqual(ready);
        expect(next.yesterday.openItems.map((i) => i.snapshotCheckId)).toEqual(['b']);
    });
});

/**
 * The poll is the fix for the skeleton that never ended. These pin the three ways it can
 * finish: the prose arrives, the server says it never will, or the schedule runs out.
 */
describe('pollNarrative', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    const pending: BriefingNarrative = { status: 'PENDING', todayLines: [], yesterdayLines: [] };
    const ready: BriefingNarrative = { status: 'READY', todayLines: ['t'], yesterdayLines: ['y'] };

    it('keeps asking while pending and reports the prose once it lands', async () => {
        vi.useFakeTimers();
        const fetch = vi.fn<[], Promise<BriefingNarrative | null>>()
            .mockResolvedValueOnce(pending)
            .mockResolvedValueOnce(ready);
        const settled = vi.fn();

        pollNarrative(fetch, settled, [10, 10, 10]);
        await vi.advanceTimersByTimeAsync(10);
        expect(settled).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(10);

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(settled).toHaveBeenCalledTimes(1);
        expect(settled).toHaveBeenCalledWith(ready);
        await vi.advanceTimersByTimeAsync(100);
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('treats a failed ask as still pending', async () => {
        vi.useFakeTimers();
        const fetch = vi.fn<[], Promise<BriefingNarrative | null>>()
            .mockResolvedValueOnce(null)
            .mockRejectedValueOnce(new Error('offline'))
            .mockResolvedValueOnce(ready);
        const settled = vi.fn();

        pollNarrative(fetch, settled, [10, 10, 10]);
        await vi.advanceTimersByTimeAsync(30);

        expect(settled).toHaveBeenCalledTimes(1);
        expect(settled).toHaveBeenCalledWith(ready);
    });

    it('stops at once when the server says the prose is unavailable', async () => {
        vi.useFakeTimers();
        const unavailable: BriefingNarrative = { status: 'UNAVAILABLE', todayLines: [], yesterdayLines: [] };
        const fetch = vi.fn<[], Promise<BriefingNarrative | null>>().mockResolvedValue(unavailable);
        const settled = vi.fn();

        pollNarrative(fetch, settled, [10, 10, 10]);
        await vi.advanceTimersByTimeAsync(100);

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(settled).toHaveBeenCalledTimes(1);
        expect(settled).toHaveBeenCalledWith(unavailable);
    });

    /** The skeleton must always end, even when the model never answers. */
    it('gives up when the schedule runs out', async () => {
        vi.useFakeTimers();
        const fetch = vi.fn<[], Promise<BriefingNarrative | null>>().mockResolvedValue(pending);
        const settled = vi.fn();

        pollNarrative(fetch, settled, [10, 10]);
        await vi.advanceTimersByTimeAsync(100);

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(settled).toHaveBeenCalledTimes(1);
        expect(settled).toHaveBeenCalledWith(NARRATIVE_GAVE_UP);
    });

    it('reports nothing after it is cancelled', async () => {
        vi.useFakeTimers();
        const fetch = vi.fn<[], Promise<BriefingNarrative | null>>().mockResolvedValue(ready);
        const settled = vi.fn();

        const cancel = pollNarrative(fetch, settled, [10]);
        cancel();
        await vi.advanceTimersByTimeAsync(100);

        expect(fetch).not.toHaveBeenCalled();
        expect(settled).not.toHaveBeenCalled();
    });
});

describe('goalPaceMessage', () => {
    const fmt = (value: number) => `#${value}`;

    it('asks a behind goal for its daily amount', () => {
        expect(goalPaceMessage({ ...goal('g'), pace: 'BEHIND', requiredPerDay: 0.8 }, fmt)).toEqual({
            key: 'BriefingGoalPaceBehind',
            params: { perDay: '#0.8', unit: 'times' },
            tone: 'flame',
        });
    });

    /** The XP is paid on completion, so a met target is a reward still waiting. */
    it('points a reached goal at marking it done', () => {
        expect(goalPaceMessage({ ...goal('g'), pace: 'REACHED', requiredPerDay: null }, fmt)?.key)
            .toBe('BriefingGoalPaceReached');
    });

    it('says nothing for a behind goal with no amount to ask for', () => {
        expect(goalPaceMessage({ ...goal('g'), pace: 'BEHIND', requiredPerDay: null }, fmt)).toBeNull();
    });

    /** A goal from a server older than the pace fields keeps its old row, no guessed verdict. */
    it('says nothing for a goal without a pace', () => {
        const older = { ...goal('g') } as Partial<BriefingGoal>;
        delete older.pace;
        expect(goalPaceMessage(older as BriefingGoal, fmt)).toBeNull();
    });

    it('only ticks the bar while there is still a pace to be on', () => {
        expect(showsExpectedPace({ ...goal('g'), pace: 'ON_TRACK' })).toBe(true);
        expect(showsExpectedPace({ ...goal('g'), pace: 'OVERDUE' })).toBe(false);
        expect(showsExpectedPace({ ...goal('g'), pace: 'REACHED' })).toBe(false);
    });
});
