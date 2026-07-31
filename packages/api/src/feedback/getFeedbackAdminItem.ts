import { TFunction } from "i18next";
import { getHttpClient } from "../httpClient";
import { parseApiError } from "../apiError";
import { getLogger } from "../logger";
import type { FeedbackAdminDetail, FeedbackAdminDetailResult } from "./feedbackTypes";

/**
 * Reads one submission with its attachments and reply thread, both oldest
 * first. List rows carry neither, so the console must fetch the detail to show
 * them. An unknown id comes back as `FEEDBACK_NOT_FOUND`.
 *
 * ROLE_ADMIN-gated: a non-admin caller gets a server-side refusal in `error`.
 */
const getFeedbackAdminItem = async (
    id: string,
    t: TFunction
): Promise<FeedbackAdminDetailResult> => {
    try {
        const response = await getHttpClient().get<FeedbackAdminDetail>(`/feedback/admin/items/${id}`);
        return { success: response.data };
    } catch (e) {
        getLogger().error(e);
        const parsed = parseApiError(e);
        return { error: Object.keys(parsed).length > 0 ? parsed : { message: t("UnexpectedError") } };
    }
};

export default getFeedbackAdminItem;
