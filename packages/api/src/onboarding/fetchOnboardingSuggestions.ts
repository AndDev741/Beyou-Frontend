import { TFunction } from "i18next";
import { getHttpClient } from "../httpClient";
import { ApiErrorPayload, parseApiError } from "../apiError";
import { getLogger } from "../logger";
import { ANALYTICS_EVENTS } from "../analyticsEvents";
import { getAnalytics } from "../analytics";
import { OnboardingSuggestionRequest, OnboardingSuggestions } from "@beyou/types/onboarding/suggestions";

type apiResponse = Promise<{ success?: OnboardingSuggestions; error?: ApiErrorPayload }>;

/**
 * This one call needs its own budget. The mobile client aborts at 20s by default
 * (nativeHttpClient's DEFAULT_TIMEOUT_MS), which is right for a REST read and far
 * too short here: the endpoint asks an LLM for a whole structured suggestion set,
 * and production has answered in 31s and 60s. The abort surfaced as a status-0
 * ApiError and the wizard showed "AI setup unavailable" on every single attempt,
 * so the fluke was that it ever looked intermittent.
 *
 * 90s is deliberately far above the observed worst case rather than just above it,
 * because the latency belongs to whichever provider the chain reaches first and a
 * cold or queued one is slower than a warm one. On web this also replaces axios's
 * default of no timeout at all: waiting forever is worse than failing.
 *
 * The agent chat does not need this. It streams (see agent/agentStream.ts), so its
 * first token arrives immediately and no abort deadline is ever in play.
 */
const SUGGESTIONS_TIMEOUT_MS = 90_000;

const fetchOnboardingSuggestions = async (
    body: OnboardingSuggestionRequest,
    t: TFunction
): apiResponse => {
    try {
        const response = await getHttpClient().post("/onboarding/suggestions", body, {
            timeout: SUGGESTIONS_TIMEOUT_MS,
        });
        // The step, and nothing else off the request: `context` and `newRequest` are the
        // user's own words about their life, which is precisely what may not leave here.
        getAnalytics().track(ANALYTICS_EVENTS.ONBOARDING_SUGGESTIONS_REQUESTED, {
            step: body.step,
        });
        return { success: response.data as OnboardingSuggestions };
    } catch (e) {
        getLogger().error(e);
        const parsed = parseApiError(e);
        return { error: parsed ?? { message: t("UnexpectedError") } };
    }
};

export default fetchOnboardingSuggestions;
