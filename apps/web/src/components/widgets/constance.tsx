import { useTranslation } from "react-i18next"
import { useSelector } from "react-redux"
import { Flame } from "lucide-react"
import type { RootState } from "@beyou/state/rootReducer"
import BaseDiv from "./baseDiv"

export type constanceProps = {
    constance: number;
}

const DAYS_SHOWN = 28;

/**
 * Streak: the big number, the record beside it and the strip of the last 28 days.
 *
 * The API returns no daily history — what we know for certain is the length of the
 * CURRENT streak. So the strip highlights only those days and leaves the rest
 * neutral; the label says so out loud, so nobody reads a dim square as "I failed".
 * When a history endpoint exists, this is where it plugs in.
 */
export default function Constance({ constance }: constanceProps) {
    const { t } = useTranslation();
    const best = useSelector((s: RootState) => s.perfil.maxConstance);
    const streakDays = Math.min(constance, DAYS_SHOWN);

    return (
        <BaseDiv title={t("Constance")} icon={<Flame size={14.5} aria-hidden="true" />}>
            <div className="mt-2.5 flex items-baseline gap-2">
                <b className="font-mono text-2xl font-semibold tracking-[-0.03em] text-text">{constance}</b>
                <span className="text-xs text-text-3">
                    {t("DaysInARow")}
                    {best > 0 && ` · ${t("Best")}: ${best}`}
                </span>
            </div>

            <div
                className="mt-3 grid grid-cols-14 gap-[3px]"
                role="img"
                aria-label={t("StreakStripLabel", { days: streakDays, total: DAYS_SHOWN })}
            >
                {Array.from({ length: DAYS_SHOWN }, (_, index) => {
                    // The current streak ends today, so it takes the END of the strip.
                    const inStreak = index >= DAYS_SHOWN - streakDays;
                    return (
                        <i
                            key={index}
                            className={`aspect-square rounded-[3px] ${inStreak ? "bg-accent" : "bg-surface-2"}`}
                        />
                    );
                })}
            </div>
            <p className="mt-2 text-[10.5px] text-text-3">{t("StreakStripCaption")}</p>
        </BaseDiv>
    )
}
