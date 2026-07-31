import { TFunction } from "i18next";
import { getHttpClient } from "../httpClient";
import { parseApiError } from "../apiError";
import { getLogger } from "../logger";
import type { FeedbackAdminItem, FeedbackAdminItemResult, FeedbackStatus } from "./feedbackTypes";

/**
 * Moves a submission between open / taking care / closed and returns the
 * updated item.
 *
 * This sends NOTHING to the submitter — status is internal triage state, and
 * the backend guarantees the silence. Only `createFeedbackReply` speaks to the
 * user. Callers must not present a status change as having notified anyone.
 *
 * ROLE_ADMIN-gated: a non-admin caller gets a server-side refusal in `error`.
 */
const updateFeedbackStatus = async (
    id: string,
    status: FeedbackStatus,
    t: TFunction
): Promise<FeedbackAdminItemResult> => {
    try {
        const response = await getHttpClient().put<FeedbackAdminItem>(
            `/feedback/admin/items/${id}/status`,
            { status }
        );
        return { success: response.data };
    } catch (e) {
        getLogger().error(e);
        const parsed = parseApiError(e);
        return { error: Object.keys(parsed).length > 0 ? parsed : { message: t("UnexpectedError") } };
    }
};

export default updateFeedbackStatus;
