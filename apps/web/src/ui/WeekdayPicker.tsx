import { useTranslation } from "react-i18next";
import type { WeekDay } from "@beyou/types/schedule/weekDay";
import { WEEK_DAYS_SUNDAY_FIRST } from "@beyou/state";

export type WeekdayPickerDayState = {
    /** Taken by something else: drawn in danger, and the caller decides what a press does. */
    blocked?: boolean;
    /** Tooltip; the full day name when absent. */
    title?: string;
};

type WeekdayPickerProps = {
    /** The selected days, as the backend writes them ("Monday"...). */
    value: readonly string[];
    onToggle: (day: WeekDay) => void;
    /** Per-day extras. The schedule modal marks the days another routine holds. */
    dayState?: (day: WeekDay) => WeekdayPickerDayState;
    /** "md" is the schedule modal's row; "sm" fits inside a routine item. */
    size?: "sm" | "md";
    className?: string;
};

/**
 * The week in one row of seven toggles, Sunday first like the routine card's squares.
 *
 * Each square shows the day's initial and is NAMED by the whole translated day ("Monday"),
 * so a screen reader and an e2e selector both hear the day and not a lone letter. Pressed
 * state is `aria-pressed`. The picker holds no state: what a press means (a blocked day, a
 * group shortcut) stays with the caller.
 */
export default function WeekdayPicker({ value, onToggle, dayState, size = "md", className = "" }: WeekdayPickerProps) {
    const { t } = useTranslation();
    const selected = new Set(value.map((day) => day.toLowerCase()));
    const sizing = size === "sm" ? "h-7 rounded-[8px] text-[11px]" : "h-8 rounded-[10px] text-[11.5px]";

    return (
        <div className={`flex gap-1.5 ${className}`}>
            {WEEK_DAYS_SUNDAY_FIRST.map((day) => {
                const state = dayState?.(day) ?? {};
                const active = selected.has(day.toLowerCase());
                return (
                    <button
                        key={day}
                        type="button"
                        aria-pressed={active}
                        aria-label={t(day)}
                        title={state.title ?? t(day)}
                        onClick={() => onToggle(day)}
                        className={`${sizing} flex-1 font-mono font-semibold transition-colors duration-200 ${
                            active
                                ? "bg-accent text-on-accent"
                                : state.blocked
                                  ? "cursor-not-allowed bg-danger/10 text-danger"
                                  : "bg-surface-2 text-text-3 hover:text-text-2"
                        }`}
                    >
                        {t(day).charAt(0).toUpperCase()}
                    </button>
                );
            })}
        </div>
    );
}
