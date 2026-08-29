import type { FocusStartReason } from './resolveFocusStart';

/**
 * The i18n key that names why this item is on screen, per reason.
 *
 * Shared so web and mobile cannot drift into saying different things about the same state,
 * and so the wording rule below lives in one place rather than in two components.
 *
 * **No reason is a reprimand.** `late` means every window has passed, and the obvious label
 * for it ("overdue", "atrasado") makes the app scold somebody for opening it in the evening.
 * It reads "still open", which is the same fact without the judgement. The gamification is not
 * allowed to make anyone feel caught.
 */
export const FOCUS_REASON_LABEL_KEY: Record<FocusStartReason, string> = {
    now: 'FocusNowLabel',
    next: 'FocusNextLabel',
    order: 'FocusOrderLabel',
    late: 'FocusOpenLabel',
    complete: 'FocusDayDone',
};

/**
 * Whether the clock chose this item.
 *
 * `order` is the LIST case and the unscheduled-DAILY case: the item is on screen because it
 * is next in the person's own order, and showing a time badge over it would invent a schedule
 * that does not exist.
 */
export const reasonIsFromClock = (reason: FocusStartReason): boolean =>
    reason === 'now' || reason === 'next' || reason === 'late';
