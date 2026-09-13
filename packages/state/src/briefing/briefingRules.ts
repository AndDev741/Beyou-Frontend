/**
 * When the Daily Briefing opens, and what happens to it while it is open.
 *
 * Shared because there are two clients and they would drift. "Should this dialog appear" is
 * the kind of rule that gets a subtly different answer on each platform within a month of
 * shipping, and the difference is invisible until somebody complains that the phone nags
 * them and the web does not.
 *
 * Everything here is pure. The server owns the facts and owns `seenAt`; this owns the
 * judgement calls that sit between the response and the screen.
 */

import type { DailyBriefing, BriefingOpenItem } from '@beyou/types/briefing/briefing';
import { briefingWorthShowing } from '@beyou/types/briefing/briefing';

/**
 * How long the right panel waits before turning itself to the recap page.
 *
 * Thirty seconds is long enough to read the "what is coming" page without being moved off
 * it, and short enough that somebody who is not reading still gets shown the second half
 * before they close the dialog.
 */
export const BRIEFING_AUTO_ADVANCE_MS = 30_000;

export type BriefingPage = 'today' | 'yesterday';

export const BRIEFING_PAGES: BriefingPage[] = ['today', 'yesterday'];

export type BriefingGateInput = {
    briefing: DailyBriefing | null;
    /** True while the onboarding tutorial or the AI wizard owns the screen. */
    tutorialActive?: boolean;
    /** True once the user has closed it in this session, so it cannot reopen on a refetch. */
    dismissedThisSession?: boolean;
};

/**
 * Whether to put the dialog on screen.
 *
 * Four ways to answer no, and each of them exists because of a specific way this feature
 * could become an annoyance:
 *
 * The server already knows it was seen. `seenAt` is a column and not local storage, so
 * closing the dialog on a phone closes it on the web. That is the whole reason the `seen`
 * route exists.
 *
 * There is nothing to say. A modal that greets somebody every morning with "nothing
 * happened" trains them to dismiss it unread, and then it is dead on the mornings it
 * matters. An account with no yesterday, no goals near due and nothing scheduled gets
 * silence.
 *
 * Something else owns the screen. The onboarding tutorial and the AI wizard both run full
 * overlays on the dashboard; a second dialog over the top is not a race worth winning. A
 * brand new account has no yesterday anyway.
 *
 * The user already closed it here. The dashboard refetches on focus and on the day turning,
 * and without this the dialog would reappear behind the user's own dismissal while the
 * `seen` write was still in flight.
 */
export function shouldOpenBriefing({
    briefing,
    tutorialActive = false,
    dismissedThisSession = false,
}: BriefingGateInput): boolean {
    if (!briefing) return false;
    if (dismissedThisSession) return false;
    if (tutorialActive) return false;
    if (briefing.seenAt) return false;
    return briefingWorthShowing(briefing);
}

/**
 * The briefing with one open item resolved, wherever it was.
 *
 * Applied optimistically the moment the user checks or skips something, so the row leaves
 * the list under their finger instead of after a round trip. The item may be in yesterday's
 * list or in the collapsed older-days list, and the caller does not have to know which.
 *
 * The counts move with it: a check becomes a done and a skip becomes a skip, so the
 * summary line above the list stays honest while the request is still out. Returns the same
 * object when nothing matched, so a caller can skip a re-render.
 */
export function resolveOpenItem(
    briefing: DailyBriefing,
    snapshotCheckId: string,
    outcome: 'checked' | 'skipped',
): DailyBriefing {
    const inYesterday = (briefing.yesterday?.openItems ?? []).some(
        (item) => item.snapshotCheckId === snapshotCheckId,
    );
    const inRecovery =
        briefing.today?.recovery?.openItems.some(
            (item) => item.snapshotCheckId === snapshotCheckId,
        ) ?? false;

    if (!inYesterday && !inRecovery) return briefing;

    const without = (items: BriefingOpenItem[]) =>
        items.filter((item) => item.snapshotCheckId !== snapshotCheckId);

    const recovery = briefing.today?.recovery ?? null;
    const remainingRecovery = recovery ? without(recovery.openItems) : [];

    return {
        ...briefing,
        yesterday: {
            ...briefing.yesterday,
            openItems: inYesterday
                ? without(briefing.yesterday.openItems)
                : briefing.yesterday.openItems,
            doneCount:
                inYesterday && outcome === 'checked'
                    ? briefing.yesterday.doneCount + 1
                    : briefing.yesterday.doneCount,
            skippedCount:
                inYesterday && outcome === 'skipped'
                    ? briefing.yesterday.skippedCount + 1
                    : briefing.yesterday.skippedCount,
        },
        today: {
            ...briefing.today,
            // An emptied window loses its affordance entirely rather than collapsing to an
            // empty accordion, which is the same rule the server applies when it builds one.
            recovery:
                !recovery || remainingRecovery.length === 0
                    ? null
                    : { ...recovery, openItems: remainingRecovery },
        },
    };
}

/**
 * Everything still open, yesterday first and older days after, oldest last.
 *
 * One list because the two panels render the same row component, and the ordering is the
 * one the user cares about: the day they are most likely to actually remember comes first.
 */
export function allOpenItems(briefing: DailyBriefing): BriefingOpenItem[] {
    return [
        ...(briefing.yesterday?.openItems ?? []),
        ...(briefing.today?.recovery?.openItems ?? []),
    ];
}

/**
 * Whether the recovery hint should read as urgent.
 *
 * One day left means tonight is the last chance, which is the only genuinely time-critical
 * thing this dialog says. Anything longer is information, not a deadline, and styling it as
 * one would make the real deadline unrecognisable when it arrives.
 */
export function recoveryIsUrgent(briefing: DailyBriefing): boolean {
    const recovery = briefing.today?.recovery ?? null;
    return recovery !== null && recovery.daysUntilExpiry <= 1;
}
