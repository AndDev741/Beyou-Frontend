import { TFunction } from "i18next";
import { getHttpClient } from "../httpClient";
import { parseApiError } from "../apiError";
import { getLogger } from "../logger";
import type { FeedbackReply, FeedbackReplyResult } from "./feedbackTypes";

/**
 * Writes the admin's reply and returns it. The backend fires exactly one email
 * to the submitter, so this is the ONLY operation in the admin set that reaches
 * the user — never call it to record internal notes.
 *
 * Body must be non-blank, max 4000 chars; the server rejects otherwise.
 * ROLE_ADMIN-gated: a non-admin caller gets a server-side refusal in `error`.
 */
const createFeedbackReply = async (
    id: string,
    body: string,
    t: TFunction
): Promise<FeedbackReplyResult> => {
    try {
        const response = await getHttpClient().post<FeedbackReply>(
            `/feedback/admin/items/${id}/replies`,
            { body }
        );
        return { success: response.data };
    } catch (e) {
        getLogger().error(e);
        const parsed = parseApiError(e);
        return { error: Object.keys(parsed).length > 0 ? parsed : { message: t("UnexpectedError") } };
    }
};

export default createFeedbackReply;
