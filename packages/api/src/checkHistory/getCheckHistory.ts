import { TFunction } from 'i18next';
import type { CheckHistory, CheckHistoryQuery } from '@beyou/types/checkday/checkHistory';
import { getHttpClient, ApiError, RequestConfig } from '../httpClient';
import { getLogger } from '../logger';

type checkHistoryResponse = { success?: CheckHistory; error?: string };

/**
 * Identical queries already in the air share one request.
 *
 * The dashboard renders its widget rail TWICE — once for the phone carousel, once
 * for the desktop column, with CSS deciding which one is seen — so the streak
 * widget and the heatmap each mount twice and would each ask twice. Every other
 * widget reads redux and costs nothing, which is why this only shows up here.
 *
 * In-flight only, deliberately: no TTL, nothing cached after the response lands.
 * A cache would have to be invalidated on every check, and the point of the
 * scalars riding the check response is that the card does not go asking again.
 *
 * The `freshness` argument is what keeps this from swallowing the refetch it was
 * built to help. Two copies of a widget rendering in the same tick must share one
 * request; a caller re-asking BECAUSE something changed must not adopt a promise
 * that started before the change. Same query + same freshness = share; a bumped
 * freshness always misses and fires for real.
 */
const inFlight = new Map<string, Promise<checkHistoryResponse>>();

/**
 * One owner's day-by-day history: habit, recurring task, routine or the account.
 *
 * Deliberately NOT folded into `GET /habit`: that endpoint is cached for thirty
 * minutes and an inlined history would grow by one entry per habit per day. One
 * call per open card is the trade.
 *
 * Omitting `from`/`to` returns the last 28 days ending on the owner's today,
 * resolved in the OWNER's timezone — which is why the widget that wants exactly
 * 28 days asks for no range at all instead of computing one from the device clock.
 *
 * `ownerType=ROUTINE` answers correctly and returns nothing: no writer records
 * routine-level outcomes yet, so every day comes back UNKNOWN. Do not build on it.
 */
/**
 * @param freshness opaque token that participates in request sharing only. Pass the
 *                  caller's own "why I am asking again" counter (the profile's check
 *                  revision) so a post-check read never joins a pre-check request.
 */
async function getCheckHistory(
    query: CheckHistoryQuery,
    t: TFunction,
    freshness?: number | string,
): Promise<checkHistoryResponse> {
    const params: NonNullable<RequestConfig['params']> = { ownerType: query.ownerType };
    if (query.ownerId) params.ownerId = query.ownerId;
    if (query.from) params.from = query.from;
    if (query.to) params.to = query.to;

    const key = JSON.stringify({ ...params, freshness });
    const pending = inFlight.get(key);
    if (pending) return pending;

    const request = (async () => {
        try {
            const response = await getHttpClient().get<CheckHistory>('/check-history', { params });
            return { success: response.data };
        } catch (e) {
            if (e instanceof ApiError) {
                getLogger().error(e);
            }
            return { error: t('UnexpectedError') };
        }
    })().finally(() => {
        inFlight.delete(key);
    });

    inFlight.set(key, request);
    return request;
}

export default getCheckHistory;
