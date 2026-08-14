import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
import { checkDayLabelKey, countDone, heatmapRange, weekAlignedCells } from "@beyou/state";
import BaseDiv from "./baseDiv";
import { CheckCell, CheckLegend } from "../../ui/CheckStrip";
import useCheckHistory from "../../hooks/useCheckHistory";
import useTodayInZone from "../../hooks/useTodayInZone";

/** Four months. Long enough to see a habit form, short enough to stay legible in the rail. */
const WEEKS_SHOWN = 16;

/**
 * Sixteen weeks of the account's days, one column per week and one row per weekday.
 *
 * NOTE ON THE DESIGN: the mockup captioned this "intensity = % of the routine
 * completed that day". That series does not exist — nothing stores XP or completion
 * per day per owner, only how the day ENDED. So a square encodes the outcome, and
 * the caption says so rather than implying a percentage nobody computed.
 *
 * The range starts on a Sunday so every row is one weekday, matching the D S T Q Q
 * S S pills elsewhere in the app. The last column is the current week and is
 * therefore short.
 */
export default function ConstanceHeatmap() {
    const { t, i18n } = useTranslation();
    // Anchored on a day that turns at midnight: memoized on the timezone alone, the
    // window froze and a refetch kept asking for the stale range.
    const anchor = useTodayInZone();
    const { from, to } = useMemo(() => heatmapRange(WEEKS_SHOWN, anchor), [anchor]);
    const { days, loading, error, today } = useCheckHistory({ ownerType: "USER", from, to });

    const cells = useMemo(() => weekAlignedCells(days), [days]);
    const formatDay = new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" });

    return (
        <BaseDiv title={t("ConstanceHeatmap")} icon={<CalendarDays size={14.5} aria-hidden="true" />}>
            <div
                className="mt-3 grid auto-cols-fr grid-flow-col grid-rows-7 gap-[3px]"
                role="img"
                aria-label={t("CheckStripLabel", { done: countDone(days), total: days.length })}
                data-testid="constance-heatmap"
                // The skeleton and the real grid are the same box; this is how a
                // reader (or a test) tells a placeholder square from a day.
                data-loading={loading ? "true" : "false"}
            >
                {loading
                    ? Array.from({ length: WEEKS_SHOWN * 7 }, (_, index) => (
                          <i key={index} className="aspect-square animate-pulse rounded-[3px] bg-surface-2" />
                      ))
                    : cells.map((day, index) => (
                          <CheckCell
                              key={day ? day.day : `pad-${index}`}
                              day={day}
                              today={today}
                              dateLabel={day ? formatDay.format(new Date(`${day.day}T12:00:00`)) : undefined}
                              outcomeLabel={day ? t(checkDayLabelKey(day, today)) : undefined}
                          />
                      ))}
            </div>

            <p className="mt-2.5 text-[10.5px] text-text-3">
                {error ? t("CheckHistoryUnavailable") : t("HeatmapCaption", { weeks: WEEKS_SHOWN })}
            </p>
            {!error && <CheckLegend className="mt-1.5" />}
        </BaseDiv>
    );
}
