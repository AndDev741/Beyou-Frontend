import { useTranslation } from "react-i18next"
import { useSelector } from "react-redux"
import { Flame } from "lucide-react"
import type { RootState } from "@beyou/state/rootReducer"
import BaseDiv from "./baseDiv"
import CheckStrip, { CheckStripSkeleton } from "../../ui/CheckStrip"
import useCheckHistory from "../../hooks/useCheckHistory"

export type constanceProps = {
    constance: number;
}

/** 14 columns × 2 rows. Also the endpoint's own default range, so the call names no dates. */
const DAYS_SHOWN = 28;

/**
 * Streak: the big number, the record beside it, and the last 28 days as they really
 * went — `GET /check-history` for the account.
 *
 * The strip used to be derived from the number itself, highlighting the last N
 * squares because that was all the API knew. It now shows the days: which were
 * done, which were skipped, and the one day that broke the run. Asking for no range
 * is deliberate — the endpoint's default is exactly these 28 days, ending on the
 * user's today in the USER's timezone, which is not always the browser's.
 */
export default function Constance({ constance }: constanceProps) {
    const { t } = useTranslation();
    const best = useSelector((s: RootState) => s.perfil.maxConstance);
    const dormant = useSelector((s: RootState) => s.perfil.constanceDormant);
    const { days, loading, error, today } = useCheckHistory({ ownerType: "USER" });

    return (
        <BaseDiv title={t("Constance")} icon={<Flame size={14.5} aria-hidden="true" />}>
            <div className="mt-2.5 flex items-baseline gap-2">
                {/* A dormant run keeps its number — it did not break, it stopped moving —
                    so the number is dimmed and labelled instead of reset. */}
                <b
                    className={`font-mono text-2xl font-semibold tracking-[-0.03em] ${dormant ? "text-text-3" : "text-text"}`}
                    data-testid="constance-value"
                >
                    {constance}
                </b>
                <span className="text-xs text-text-3">
                    {t("DaysInARow", { count: constance })}
                    {best > 0 && ` · ${t("Best")}: ${best}`}
                </span>
            </div>

            {dormant && constance > 0 && (
                <p className="mt-1 text-[11px] text-text-3" data-testid="constance-dormant">
                    {t("StreakPausedExplanation")}
                </p>
            )}

            <div className="mt-3">
                {loading ? (
                    <CheckStripSkeleton length={DAYS_SHOWN} />
                ) : (
                    <CheckStrip days={days} today={today} testId="streak-strip" />
                )}
            </div>

            <p className="mt-2 text-[10.5px] text-text-3">
                {error ? t("CheckHistoryUnavailable") : t("StreakStripCaption")}
            </p>
        </BaseDiv>
    )
}
