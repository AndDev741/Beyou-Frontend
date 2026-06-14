import { TFunction } from "i18next";
import { getHttpClient } from "../httpClient";
import { ApiErrorPayload, parseApiError } from "../apiError";
import { GenerateRoutinePayload, RoutineDraft } from "@beyou/types/ai/routineDraft";
import { getLogger } from "../logger";

type apiResponse = Promise<{ success?: { draft: RoutineDraft }; error?: ApiErrorPayload }>;

// AI generation is slow — reasoning models can take well over a minute for a
// full routine draft, so give the request a generous budget.
const AI_TIMEOUT_MS = 180000;

async function generateRoutine(payload: GenerateRoutinePayload, t: TFunction): apiResponse {
    try {
        const response = await getHttpClient().post<{ draft: RoutineDraft }>(
            "/ai/routine/generate", payload, { timeout: AI_TIMEOUT_MS });
        return { success: response.data };
    } catch (e) {
        getLogger().error(e);
        const parsed = parseApiError(e);
        const hasInfo = parsed.errorKey || parsed.message || parsed.details;
        return { error: hasInfo ? parsed : { message: t("UnexpectedError") } };
    }
}

export default generateRoutine;
