import { useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { notebookStatusesChanged } from "@beyou/state";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import { setPageStatus } from "@beyou/api/notebook";
import type { StatusChange, StatusChoice } from "@beyou/types/notebook/notebook";
import type { RefreshUI } from "@beyou/types/refreshUi/refreshUi.type";
import useUiRefresh from "../../hooks/useUiRefresh";

/**
 * Sets a page's status and writes what moved everywhere it shows. A first finish pays XP; the
 * toast says how much, and the profile and category repaint from the same answer.
 */
export function useStatusChange() {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [refreshUi, setRefreshUi] = useState<RefreshUI>({});
    useUiRefresh(refreshUi);

    return useCallback(
        async (pageId: string, status: StatusChoice): Promise<StatusChange | null> => {
            const response = await setPageStatus(pageId, status, t);
            if (!response.success) {
                toast.error(getFriendlyErrorMessage(t, response.error));
                return null;
            }
            const change = response.success;
            const moved = change.changed.length ? change.changed : [{ pageId: change.pageId, status: change.status }];
            dispatch(notebookStatusesChanged(moved));
            if (change.refreshUi) setRefreshUi(change.refreshUi);
            if (change.xpEarned > 0) toast.success(t("NotebookXpEarned", { xp: change.xpEarned }));
            return change;
        },
        [t, dispatch]
    );
}
