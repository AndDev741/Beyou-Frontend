import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { stripRange, todayInZone } from "@beyou/state";
import type { RootState } from "@beyou/state/rootReducer";
import type { CheckDayOwnerType } from "@beyou/types/checkday/checkHistory";
import CheckStrip, { CheckStripSkeleton } from "../../ui/CheckStrip";
import useCheckHistory from "../../hooks/useCheckHistory";

const DAYS_SHOWN = 14;

type LastTwoWeeksStripProps = {
    ownerType: CheckDayOwnerType;
    ownerId: string;
};

/**
 * The fortnight under an expanded card.
 *
 * Mounts with the expanded view, so a page of twenty habits costs zero history
 * calls until someone opens one — the list endpoint deliberately does not carry the
 * days, and one call per open card is the price of that.
 */
export default function LastTwoWeeksStrip({ ownerType, ownerId }: LastTwoWeeksStripProps) {
    const { t } = useTranslation();
    const timezone = useSelector((state: RootState) => state.perfil.timezone);
    const { from, to } = useMemo(() => stripRange(DAYS_SHOWN, todayInZone(timezone)), [timezone]);
    const { days, loading, error, today } = useCheckHistory({ ownerType, ownerId, from, to });

    return (
        <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-3">
                {t("LastTwoWeeks")}
            </p>
            {loading ? (
                <CheckStripSkeleton length={DAYS_SHOWN} />
            ) : error ? (
                <p className="text-[11px] text-text-3">{t("CheckHistoryUnavailable")}</p>
            ) : (
                <CheckStrip days={days} today={today} testId={`check-strip-${ownerId}`} />
            )}
        </div>
    );
}
