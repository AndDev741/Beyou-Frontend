import { TFunction } from 'i18next';
import { getHttpClient, ApiError } from '../httpClient';
import { ApiErrorPayload, parseApiError } from '../apiError';
import { getLogger } from '../logger';
import type { BriefingNarrative, DailyBriefing } from '@beyou/types/briefing/briefing';

type Result<T> = { success?: T; error?: ApiErrorPayload };

/**
 * The Daily Briefing.
 *
 * Neither call takes a date. The server always answers for the caller's own today, resolved
 * from the account's timezone — letting a client name the day would mean the device's clock
 * deciding which day is being described and which row `seen` marks, and the two apps would
 * disagree the moment one of them sat in a different zone from the account.
 *
 * `getDailyBriefing` can take several seconds on the first call of a day: it may be waiting
 * on the LLM that writes the prose. Callers should render the dialog from data they already
 * hold and let this fill the narrative in, rather than gating the dialog on it.
 */

const fail = <T>(e: unknown, t: TFunction): Result<T> => {
    if (e instanceof ApiError) {
        getLogger().error(e);
        return { error: parseApiError(e) };
    }
    return { error: { message: t('UnexpectedError') } };
};

export async function getDailyBriefing(t: TFunction): Promise<Result<DailyBriefing>> {
    try {
        const response = await getHttpClient().get<DailyBriefing>('/daily-briefing');
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

/**
 * Today's prose on its own, for a dialog that got PENDING and is waiting for it.
 *
 * A primary-key read on the server that never starts a model call, which is why it can be
 * polled: `GET /daily-briefing` recomputes every fact and sits in a ten-an-hour bucket.
 * Drive it through `pollNarrative` in @beyou/state rather than a hand-rolled loop.
 */
export async function getBriefingNarrative(t: TFunction): Promise<Result<BriefingNarrative>> {
    try {
        const response = await getHttpClient().get<BriefingNarrative>('/daily-briefing/narrative');
        return { success: response.data };
    } catch (e) {
        return fail(e, t);
    }
}

/**
 * Records that the user has seen today's dialog.
 *
 * Fire-and-forget from the caller's point of view: the dialog closes on the user's action,
 * not on this resolving. A failure here means it may open once more on another device, which
 * is a far smaller cost than a close button that spins.
 */
export async function markBriefingSeen(t: TFunction): Promise<Result<true>> {
    try {
        await getHttpClient().post('/daily-briefing/seen');
        return { success: true };
    } catch (e) {
        return fail(e, t);
    }
}
