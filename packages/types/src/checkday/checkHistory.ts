/**
 * `GET /check-history` — how each day ended for one checkable owner.
 *
 * The endpoint is owner-parameterised: habits, recurring tasks, routines and the
 * account itself all read through it. There is one entry per day of the range and
 * never a gap, so a client maps the array in order instead of aligning dates.
 */

export type CheckDayOwnerType = "HABIT" | "TASK" | "ROUTINE" | "USER";

/**
 * The five stored outcomes plus `UNKNOWN`, which is the wire's word for "no row".
 *
 * Only `MISSED` breaks a streak. `SKIPPED` keeps it and does not count as a
 * check-in; the last three are crossed without interrupting anything.
 */
export type CheckDayOutcome =
    /** Checked off. The only outcome that advances a streak. */
    | "DONE"
    /** Deliberately skipped. Keeps the streak, is not a check-in. */
    | "SKIPPED"
    /** Was scheduled and left unchecked. The only outcome that breaks a streak. */
    | "MISSED"
    /** In a routine, but that routine does not run on this weekday. */
    | "NOT_SCHEDULED"
    /** In no routine at all that day, so nothing could have been expected. */
    | "NOT_IN_ROUTINE"
    /**
     * No row stored. Neither a success nor a failure — and what TODAY reads as
     * until it is checked, because a day's outcome is only decided once it closes.
     */
    | "UNKNOWN";

export type CheckDay = {
    /** `yyyy-MM-dd` in the owner's timezone, not the server's. */
    day: string;
    outcome: CheckDayOutcome;
};

export type CheckHistory = {
    ownerType: CheckDayOwnerType;
    ownerId: string;
    /**
     * The EFFECTIVE range, which is not always the requested one: a range wider
     * than the endpoint's 366-day cap comes back clamped rather than refused.
     * Render from these two, never from the request parameters.
     */
    from: string;
    to: string;
    /** One entry per day, oldest first, no gaps. */
    days: CheckDay[];
};

export type CheckHistoryQuery = {
    ownerType: CheckDayOwnerType;
    /** Optional only for `USER`, where it resolves to the authenticated account. */
    ownerId?: string;
    /** `yyyy-MM-dd`, inclusive. Omitting both ends returns the last 28 days. */
    from?: string;
    to?: string;
};
