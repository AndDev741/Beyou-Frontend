import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { WeekDay } from "@beyou/types/schedule/weekDay";
import { followsRoutine, formatItemDays, itemDaysMissSchedule, toggleItemDay } from "@beyou/state";
import WeekdayPicker from "../../ui/WeekdayPicker";

type ItemDaysFieldProps = {
    days: readonly string[] | undefined;
    onChange: (days: WeekDay[]) => void;
    /** The routine's schedule, to warn when the item's days never meet it. None while creating. */
    scheduleDays?: readonly string[];
    className?: string;
};

/**
 * The days a routine item runs on, inside the days the routine runs.
 *
 * Nothing pressed is the default and reads "Every day of the routine". A group named "Days"
 * holds seven toggles named by the full day. Used by the daily routine's item editor and by
 * the list routine's rows.
 */
export default function ItemDaysField({ days, onChange, scheduleDays, className = "" }: ItemDaysFieldProps) {
    const { t } = useTranslation();
    const labelId = useId();
    const misses = itemDaysMissSchedule(days, scheduleDays);

    return (
        <div role="group" aria-labelledby={labelId} className={className}>
            <div className="flex items-baseline gap-2">
                <span id={labelId} className="text-[11.5px] font-semibold text-text-2">
                    {t("Days")}
                </span>
                {followsRoutine(days) && (
                    <span className="text-[11.5px] text-text-3">{t("ItemDaysFollowRoutine")}</span>
                )}
            </div>
            <WeekdayPicker
                size="sm"
                className="mt-1.5"
                value={days ?? []}
                onToggle={(day) => onChange(toggleItemDay(days, day))}
            />
            {misses && <p className="mt-1.5 text-xs text-danger">{t("ItemDaysMissSchedule")}</p>}
        </div>
    );
}

/**
 * The item's days in short form ("Sat · Sun"), drawn only when it has some. The tooltip says
 * what the letters mean.
 */
export function ItemDaysChip({ days, className = "" }: { days: readonly string[] | undefined; className?: string }) {
    const { t } = useTranslation();
    const label = formatItemDays(days, t);
    if (!label) return null;
    return (
        <span
            title={t("ItemOnlyOnDays", { days: label })}
            className={`shrink-0 whitespace-nowrap rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[11px] font-semibold text-accent ${className}`}
        >
            {label}
        </span>
    );
}
