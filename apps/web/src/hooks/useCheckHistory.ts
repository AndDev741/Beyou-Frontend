import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import getCheckHistory from "@beyou/api/checkHistory/getCheckHistory";
import { todayInZone } from "@beyou/state";
import type { RootState } from "@beyou/state/rootReducer";
import type { CheckDay, CheckDayOwnerType } from "@beyou/types/checkday/checkHistory";

type UseCheckHistoryArgs = {
    ownerType: CheckDayOwnerType;
    /** Optional only for `USER`. */
    ownerId?: string;
    /** `yyyy-MM-dd`. Leave both out for the endpoint's default: 28 days to the owner's today. */
    from?: string;
    to?: string;
    /**
     * Gate for the lazy case — a habit card fetches when it opens, not when the
     * grid renders, so a page of twenty habits costs no calls at all.
     */
    enabled?: boolean;
};

type UseCheckHistoryResult = {
    days: CheckDay[];
    loading: boolean;
    error: string | null;
    /** Today in the USER's timezone, which decides which square is still open. */
    today: string;
};

/**
 * One `GET /check-history` call, kept in component state.
 *
 * Args are primitives so the effect's dependencies are the query itself: passing an
 * object literal from a render would refetch on every keystroke elsewhere on the page.
 */
export default function useCheckHistory({
    ownerType,
    ownerId,
    from,
    to,
    enabled = true,
}: UseCheckHistoryArgs): UseCheckHistoryResult {
    const { t } = useTranslation();
    const timezone = useSelector((state: RootState) => state.perfil.timezone);
    const [days, setDays] = useState<CheckDay[]>([]);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        setLoading(true);
        setError(null);

        getCheckHistory({ ownerType, ownerId, from, to }, t).then((response) => {
            if (cancelled) return;
            if (response.success) {
                setDays(response.success.days ?? []);
            } else {
                setError(response.error ?? t("UnexpectedError"));
                setDays([]);
            }
            setLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [ownerType, ownerId, from, to, enabled, t]);

    const today = useMemo(() => todayInZone(timezone), [timezone]);

    return { days, loading, error, today };
}
