import { TFunction } from "i18next";
import axios from "../axiosConfig";
import { ApiErrorPayload, parseApiError } from "../apiError";
import { RoutineDraft } from "@beyou/types/ai/routineDraft";
import { MaterializeResponse } from "@beyou/types/ai/materialize";

type apiResponse = Promise<{ success?: MaterializeResponse; error?: ApiErrorPayload }>;

const AI_TIMEOUT_MS = 180000;

/**
 * Persists the draft's NEW categories/habits/tasks and returns the structure
 * as plain refs (shaped for the manual routine form). The routine itself is
 * NOT created here — the user finishes through the normal create/edit form.
 */
async function materializeRoutine(draft: RoutineDraft, t: TFunction): apiResponse {
    try {
        const response = await axios.post<MaterializeResponse>(
            "/ai/routine/materialize", draft, { timeout: AI_TIMEOUT_MS });
        return { success: response.data };
    } catch (e) {
        console.error(e);
        const parsed = parseApiError(e);
        const hasInfo = parsed.errorKey || parsed.message || parsed.details;
        return { error: hasInfo ? parsed : { message: t("UnexpectedError") } };
    }
}

export default materializeRoutine;
