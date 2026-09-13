/**
 * The Daily Briefing: the dialog a user meets on the first dashboard open of a new day.
 *
 * Wire names match the backend's `DailyBriefingResponseDTO`.
 *
 * Two halves with different guarantees, and keeping them apart is the whole design.
 * `yesterday` and `today` are computed from the database and always arrive. `narrative` is
 * generated prose and often will not — its status says why — so every client renders its own
 * translated copy when the lines are empty. Nothing in here that the user reads as a number
 * comes from a model.
 */

/** Where the generated half stands. None of these is an error. */
export type NarrativeStatus =
    /** Asked for; the model had not answered by the request's deadline. It may still land. */
    | 'PENDING'
    /** The lines below are real. */
    | 'READY'
    /** The chain refused or failed. Not retried for the rest of the day. */
    | 'UNAVAILABLE';

/**
 * One thing a past day is still waiting on.
 *
 * `snapshotId` and `snapshotCheckId` are exactly what `POST /routine/snapshot/check` and
 * `/skip` take, so the dialog acts through the endpoints that already exist rather than
 * through a briefing-shaped variant of them.
 */
export type BriefingOpenItem = {
    snapshotId: string;
    snapshotCheckId: string;
    /** The day this belongs to, `yyyy-MM-dd`. Not always yesterday: see `RecoveryWindow`. */
    date: string;
    routineId: string | null;
    routineName: string;
    itemType: 'HABIT' | 'TASK';
    itemName: string;
    itemIconId: string | null;
    sectionName: string;
    /**
     * What checking this right now actually pays, after the account's XP decay.
     *
     * Shown in the UI deliberately. Someone who checks a forgotten habit and watches a
     * smaller number than usual land, with no explanation, reads it as a bug.
     */
    xpIfCheckedNow: number;
};

export type BriefingYesterday = {
    date: string;
    /**
     * Whether any routine covered the day.
     *
     * False means nothing was asked of the user, which is NOT the same as a day they
     * ignored, and must never be rendered as a failure.
     */
    hadRoutine: boolean;
    /** Every routine of the day finished, under the account's own constance setting. */
    complete: boolean;
    doneCount: number;
    /** Deliberate skips. A choice the user made; never counted against them. */
    skippedCount: number;
    xpEarned: number;
    openItems: BriefingOpenItem[];
    focusCycles: number;
    /** 1-5, or null if no mood was logged that day. */
    moodLevel: number | null;
};

export type BriefingGoal = {
    id: string;
    name: string;
    iconId: string | null;
    currentValue: number;
    targetValue: number;
    unit: string;
    endDate: string;
    /** Whole days from today. Negative means overdue, which is worth saying out loud. */
    daysRemaining: number;
    percentComplete: number;
};

/**
 * Days older than yesterday that a retroactive check would still be accepted for.
 *
 * Collapsed in the UI by default: the left panel is about yesterday, and a list of seven
 * days every morning teaches people to close the dialog without reading it.
 */
export type BriefingRecoveryWindow = {
    oldestOpenDay: string;
    /** Days before `oldestOpenDay` stops being checkable. 1 means tonight is the last chance. */
    daysUntilExpiry: number;
    /** What a check on that day still pays, as a percentage. Can legitimately be 0. */
    remainingXpPercent: number;
    openItems: BriefingOpenItem[];
};

export type BriefingToday = {
    scheduledItemCount: number;
    /**
     * Whether any routine covers today.
     *
     * False means nothing is at risk: the streak counts scheduled days, so a day with
     * nothing on it cannot break one.
     */
    scheduledToday: boolean;
    currentStreak: number;
    bestStreak: number;
    goalsApproaching: BriefingGoal[];
    recovery: BriefingRecoveryWindow | null;
};

export type BriefingNarrative = {
    status: NarrativeStatus;
    /** Up to three lines for the "what is coming" page. Empty unless status is READY. */
    todayLines: string[];
    /** Up to three lines for the recap page. Empty unless status is READY. */
    yesterdayLines: string[];
};

export type DailyBriefing = {
    date: string;
    yesterday: BriefingYesterday;
    today: BriefingToday;
    narrative: BriefingNarrative;
    /**
     * When the user last acknowledged this day's dialog, or null.
     *
     * Read from the server rather than from local storage, which is the point: closing
     * yesterday's loose ends on a phone has to close the dialog on the web too.
     */
    seenAt: string | null;
};

/**
 * Whether this briefing is worth interrupting somebody with.
 *
 * Mirrors `DailyBriefingResponseDTO.worthShowing()`. Duplicated here rather than sent as a
 * field so a client can re-decide after the user acts — checking the last open item inside
 * the dialog does not retroactively make the morning uninteresting, but a client that
 * re-fetches needs the same answer the server would give.
 *
 * A finished yesterday counts. An account that simply had no yesterday does not, which is
 * every account on its first two mornings.
 */
export function briefingWorthShowing(briefing: DailyBriefing | null): boolean {
    if (!briefing) return false;
    // Read defensively, and not as a formality. This value comes off the wire, the dialog
    // it gates renders on the dashboard, and a shape this did not expect used to throw
    // straight through the dashboard's own render. A briefing that cannot be understood is
    // a briefing not worth showing, which is a far better answer than a blank home screen.
    const yesterday = briefing.yesterday;
    const today = briefing.today;
    const aboutYesterday = Boolean(yesterday?.hadRoutine) || (yesterday?.moodLevel ?? null) !== null;
    const aboutToday =
        (today?.scheduledItemCount ?? 0) > 0 ||
        (today?.goalsApproaching?.length ?? 0) > 0 ||
        (today?.recovery ?? null) !== null;
    return aboutYesterday || aboutToday;
}
