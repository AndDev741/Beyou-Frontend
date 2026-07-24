import { TFunction } from "i18next";
import { getHttpClient } from "../httpClient";
import { ApiErrorPayload, parseApiError } from "../apiError";
import { getLogger } from "../logger";
import { OnboardingSuggestionRequest, OnboardingSuggestions } from "@beyou/types/onboarding/suggestions";

type apiResponse = Promise<{ success?: OnboardingSuggestions; error?: ApiErrorPayload }>;

const fetchOnboardingSuggestions = async (
    body: OnboardingSuggestionRequest,
    t: TFunction
): apiResponse => {
    try {
        const response = await getHttpClient().post("/onboarding/suggestions", body);
        return { success: response.data as OnboardingSuggestions };
    } catch (e) {
        getLogger().error(e);
        const parsed = parseApiError(e);
        return { error: parsed ?? { message: t("UnexpectedError") } };
    }
};

export default fetchOnboardingSuggestions;
