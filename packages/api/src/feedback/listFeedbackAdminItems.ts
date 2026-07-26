import { TFunction } from "i18next";
import { getHttpClient } from "../httpClient";
import { parseApiError } from "../apiError";
import { getLogger } from "../logger";
import type { FeedbackAdminPage, FeedbackAdminPageResult, ListFeedbackAdminItemsQuery } from "./feedbackTypes";

/**
 * Reads one page of submissions for the triage console. Newest first; filters
 * are AND-ed server-side. `totalItems`/`totalPages` describe the FILTERED set,
 * so they cannot stand in for the inbox-wide counters — use
 * `getFeedbackAdminCounts` for those.
 *
 * ROLE_ADMIN-gated: a non-admin caller gets a server-side refusal in `error`.
 */
const listFeedbackAdminItems = async (
    query: ListFeedbackAdminItemsQuery,
    t: TFunction
): Promise<FeedbackAdminPageResult> => {
    // Only send what the caller actually chose; an empty string would be a
    // filter value the backend has to interpret rather than an absent filter.
    const params: Record<string, string | number> = {
        ...(query.status ? { status: query.status } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.page !== undefined ? { page: query.page } : {}),
        ...(query.size !== undefined ? { size: query.size } : {})
    };

    try {
        const response = await getHttpClient().get<FeedbackAdminPage>("/feedback/admin/items", { params });
        return { success: response.data };
    } catch (e) {
        getLogger().error(e);
        const parsed = parseApiError(e);
        return { error: Object.keys(parsed).length > 0 ? parsed : { message: t("UnexpectedError") } };
    }
};

export default listFeedbackAdminItems;
