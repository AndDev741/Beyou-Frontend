import { TFunction } from "i18next";
import { getHttpClient } from "../httpClient";
import { parseApiError } from "../apiError";
import { getLogger } from "../logger";
import type { FeedbackCounts, FeedbackCountsResult } from "./feedbackTypes";

/**
 * Reads the inbox-wide counters. Unfiltered by design: the console shows how
 * much work exists in total, which is a different question from how many rows
 * the current filter returned.
 *
 * ROLE_ADMIN-gated: a non-admin caller gets a server-side refusal in `error`.
 */
const getFeedbackAdminCounts = async (t: TFunction): Promise<FeedbackCountsResult> => {
    try {
        const response = await getHttpClient().get<FeedbackCounts>("/feedback/admin/counts");
        return { success: response.data };
    } catch (e) {
        getLogger().error(e);
        const parsed = parseApiError(e);
        return { error: Object.keys(parsed).length > 0 ? parsed : { message: t("UnexpectedError") } };
    }
};

export default getFeedbackAdminCounts;
