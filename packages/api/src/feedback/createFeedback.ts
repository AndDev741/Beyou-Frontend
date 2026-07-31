import { TFunction } from "i18next";
import { getHttpClient } from "../httpClient";
import { parseApiError } from "../apiError";
import { getLogger } from "../logger";
import type { CreateFeedbackRequest, CreateFeedbackResult, FeedbackResponse } from "./feedbackTypes";

/**
 * Stores one feedback submission. Images are attached afterwards, per-request,
 * against the returned id — see `submitFeedback` for the whole sequence.
 *
 * Rate limited to 10/hour per user; over budget the error envelope carries
 * `errorKey: RATE_LIMIT_EXCEEDED`.
 */
const createFeedback = async (
    request: CreateFeedbackRequest,
    t: TFunction
): Promise<CreateFeedbackResult> => {
    const payload: CreateFeedbackRequest = {
        category: request.category,
        body: request.body,
        ...(request.context ? { context: request.context } : {})
    };

    try {
        const response = await getHttpClient().post<FeedbackResponse>("/feedback", payload);
        return { success: response.data };
    } catch (e) {
        getLogger().error(e);
        const parsed = parseApiError(e);
        return { error: Object.keys(parsed).length > 0 ? parsed : { message: t("UnexpectedError") } };
    }
};

export default createFeedback;
