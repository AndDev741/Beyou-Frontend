import { TFunction } from "i18next";
import { getHttpClient } from "../httpClient";
import { ApiErrorPayload, parseApiError } from "../apiError";
import { getLogger } from "../logger";
import { ANALYTICS_EVENTS } from "../analyticsEvents";
import { getAnalytics } from "../analytics";
import { OnboardingSuggestionRequest, OnboardingSuggestions } from "@beyou/types/onboarding/suggestions";

type apiResponse = Promise<{ success?: OnboardingSuggestions; error?: ApiErrorPayload }>;

const fetchOnboardingSuggestions = async (
    body: OnboardingSuggestionRequest,
    t: TFunction
): apiResponse => {
    try {
        const response = await getHttpClient().post("/onboarding/suggestions", body);
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
