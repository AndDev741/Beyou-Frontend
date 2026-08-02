import { useMemo, useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Routine } from "@beyou/types/routine/routine";
import { RootState } from "@beyou/state/rootReducer";
import { FiCalendar, FiChevronLeft, FiChevronRight } from "react-icons/fi";

type RoutineSummaryProps = {
    routines: Routine[];
    selectedDate: string;
    onDateChange: (value: string) => void;
};

/** Returns ISO date string YYYY-MM-DD for N days ago (0 = today). */
function getDateDaysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split("T")[0];
}

/** Returns the last 5 days including today, oldest→newest. */
function getLast5Days(): string[] {
    return [4, 3, 2, 1, 0].map(getDateDaysAgo);
}

// ─── DayChip ──────────────────────────────────────────────────────────────────

interface DayChipProps {
    dateStr: string;
    isSelected: boolean;
    isToday: boolean;
    locale: string;
    isSnapshotMode: boolean;
    onClick: () => void;
}

function DayChip({ dateStr, isSelected, isToday, locale, isSnapshotMode, onClick }: DayChipProps) {
    // Parse at noon to avoid timezone day-shift issues
    const date = new Date(dateStr + "T12:00:00");

    const shortDay = new Intl.DateTimeFormat(locale, { weekday: "short" })
        .format(date)
        .replace(/\.$/, "")   // Portuguese adds a period: "seg." → "seg"
        .slice(0, 3)
        .toUpperCase();

    const dayNum = date.getDate();

    const baseClasses =
        "relative flex flex-col items-center justify-center rounded-full border-2 w-10 h-10 md:w-12 md:h-12 " +
        "transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 cursor-pointer";

    const stateClasses = isSelected
        ? isSnapshotMode
            ? "bg-description/15 border-border text-text-2 shadow-sm scale-110 ring-2 ring-description ring-offset-2 ring-offset-background"
            : "bg-accent border-border text-on-accent shadow-sm scale-110 ring-2 ring-accent ring-offset-2 ring-offset-background"
        : "border-border hover:border-border hover:bg-accent/5 hover:scale-105";

    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={isSelected}
            className={`${baseClasses} ${stateClasses}`}
        >
            <span
                className={`text-[9px] md:text-[10px] font-bold leading-none tracking-wide
                    ${isSelected ? "" : "text-text-2"}`}
            >
                {shortDay}
            </span>
            <span
                className={`text-xs md:text-sm font-bold leading-none mt-0.5
                    ${isSelected ? "" : "text-text"}`}
            >
                {dayNum}
            </span>
            {/* Today indicator dot (only when not selected) */}
            {isToday && !isSelected && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-accent" />
            )}
        </button>
    );
}

// ─── CalendarPopover ──────────────────────────────────────────────────────────

interface CalendarPopoverProps {
    selectedDate: string;
    today: string;
    locale: string;
    isSnapshotMode: boolean;
    onDateChange: (date: string) => void;
    onClose: () => void;
}

function CalendarPopover({
    selectedDate,
    today,
    locale,
    isSnapshotMode,
    onDateChange,
    onClose,
}: CalendarPopoverProps) {
    const initialDate = new Date(selectedDate + "T12:00:00");
    const todayDate = new Date(today + "T12:00:00");

    const [viewYear, setViewYear] = useState(initialDate.getFullYear());
    const [viewMonth, setViewMonth] = useState(initialDate.getMonth()); // 0-indexed

    // Locale-aware month + year label
    const monthLabel = useMemo(() => {
        const raw = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
            new Date(viewYear, viewMonth, 1)
        );
        return raw.charAt(0).toUpperCase() + raw.slice(1);
    }, [locale, viewYear, viewMonth]);

    // Locale-aware single-letter weekday headers (Sun … Sat)
    const dayHeaders = useMemo(
        () =>
            [0, 1, 2, 3, 4, 5, 6].map((i) =>
                new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(
                    new Date(2024, 0, 7 + i) // Jan 7 2024 is a Sunday
                )
            ),
        [locale]
    );

    // Build grid cells (null = empty leading cell)
    const cells = useMemo<(number | null)[]>(() => {
        const firstWeekday = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        return [
            ...Array<null>(firstWeekday).fill(null),
            ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
        ];
    }, [viewYear, viewMonth]);

    // Can we navigate forward? Only up to the current month.
    const canGoNext = useMemo(
        () =>
            new Date(viewYear, viewMonth + 1, 1) <=
            new Date(todayDate.getFullYear(), todayDate.getMonth(), 1),
        [viewYear, viewMonth, todayDate]
    );

    const goToPrev = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear((y) => y - 1);
        } else {
            setViewMonth((m) => m - 1);
        }
    };

    const goToNext = () => {
        if (!canGoNext) return;
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear((y) => y + 1);
        } else {
            setViewMonth((m) => m + 1);
        }
    };

    const buildDateStr = (day: number) =>
        `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const selectDay = (day: number) => {
        const dateStr = buildDateStr(day);
        if (dateStr > today) return;
        onDateChange(dateStr);
        onClose();
    };

    return (
        <div className="w-[17rem] rounded-card border border-border bg-surface p-4 shadow-2xl">
            {/* Month navigation header */}
            <div className="flex items-center justify-between mb-3">
                <button
                    type="button"
                    onClick={goToPrev}
                    className="rounded-control p-1.5 text-text hover:bg-accent/10 hover:text-accent transition"
                    aria-label="Previous month"
                >
                    <FiChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold text-text">{monthLabel}</span>
                <button
                    type="button"
                    onClick={goToNext}
                    disabled={!canGoNext}
                    className="rounded-control p-1.5 text-text hover:bg-accent/10 hover:text-accent transition disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Next month"
                >
                    <FiChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
                {dayHeaders.map((h, i) => (
                    <div
                        key={i}
                        className="flex items-center justify-center h-7 text-[10px] font-semibold text-text-2 uppercase"
                    >
                        {h}
                    </div>
                ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-0.5">
                {cells.map((day, idx) => {
                    if (!day) return <div key={idx} className="h-8" />;

                    const dateStr = buildDateStr(day);
                    const isFuture = dateStr > today;
                    const isSelected = dateStr === selectedDate;
                    const isTodayCell = dateStr === today;

                    return (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => !isFuture && selectDay(day)}
                            disabled={isFuture}
                            className={[
                                "flex items-center justify-center rounded-full w-8 h-8 mx-auto text-xs font-medium transition-all duration-150",
                                isFuture ? "text-text-2/30 cursor-not-allowed" : "cursor-pointer",
                                isSelected
                                    ? isSnapshotMode
                                        ? "bg-description/20 text-text font-bold ring-2 ring-description/30"
                                        : "bg-accent text-on-accent font-bold shadow-sm"
                                    : isTodayCell
                                    ? "ring-2 ring-accent/40 text-accent font-bold"
                                    : !isFuture
                                    ? "hover:bg-accent/10 text-text"
                                    : "",
                            ]
                                .filter(Boolean)
                                .join(" ")}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ─── DatePickerBar ────────────────────────────────────────────────────────────

interface DatePickerBarProps {
    selectedDate: string;
    today: string;
    locale: string;
    isSnapshotMode: boolean;
    onDateChange: (date: string) => void;
    t: (key: string) => string;
}

function DatePickerBar({
    selectedDate,
    today,
    locale,
    isSnapshotMode,
    onDateChange,
    t,
}: DatePickerBarProps) {
    const [calendarOpen, setCalendarOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const last5 = useMemo(() => getLast5Days(), []);

    // Close on Escape
    useEffect(() => {
        if (!calendarOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") setCalendarOpen(false);
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [calendarOpen]);

    // Close on outside click
    useEffect(() => {
        if (!calendarOpen) return;
        const handler = (e: MouseEvent) => {
            if (
                popoverRef.current?.contains(e.target as Node) ||
                triggerRef.current?.contains(e.target as Node)
            )
                return;
            setCalendarOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [calendarOpen]);

    // When selected date is older than 5 days, show it formatted in the button
    const isOlderDate = !last5.includes(selectedDate);
    const formattedOlderDate = isOlderDate
        ? new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(
              new Date(selectedDate + "T12:00:00")
          )
        : null;

    const calendarBtnActive = calendarOpen || isOlderDate;

    return (
        <div className="flex flex-col items-center md:items-end gap-1">
            <div className="flex items-center gap-1.5">
                {/* Quick day chips — last 5 days */}
                {last5.map((dateStr) => (
                    <DayChip
                        key={dateStr}
                        dateStr={dateStr}
                        isSelected={selectedDate === dateStr}
                        isToday={dateStr === today}
                        locale={locale}
                        isSnapshotMode={isSnapshotMode}
                        onClick={() => onDateChange(dateStr)}
                    />
                ))}

                {/* Calendar button + popover — anchored right so it never clips */}
                <div className="relative ml-1">
                    <button
                        ref={triggerRef}
                        type="button"
                        onClick={() => setCalendarOpen((o) => !o)}
                        aria-expanded={calendarOpen}
                        aria-label={t("More dates")}
                        className={[
                            "flex items-center gap-1.5 rounded-card border px-2.5 py-1.5 text-xs font-medium transition-all duration-200",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                            calendarBtnActive
                                ? isSnapshotMode
                                    ? "border-border/50 bg-description/10 text-text-2"
                                    : "border-border bg-accent/10 text-accent"
                                : "border-border text-text hover:border-border hover:bg-accent/5",
                        ].join(" ")}
                    >
                        <FiCalendar className="w-3.5 h-3.5 flex-shrink-0" />
                        {/* Show formatted date when older selection, otherwise "More dates" label */}
                        <span className="hidden sm:inline whitespace-nowrap">
                            {formattedOlderDate ?? t("More dates")}
                        </span>
                    </button>

                    {calendarOpen && (
                        <div
                            ref={popoverRef}
                            // right-0 keeps the popover anchored to the button's right edge,
                            // opening leftward — this fixes the Saturday-gets-clipped bug.
                            className="absolute z-50 mt-2 right-0"
                        >
                            <CalendarPopover
                                selectedDate={selectedDate}
                                today={today}
                                locale={locale}
                                isSnapshotMode={isSnapshotMode}
                                onDateChange={onDateChange}
                                onClose={() => setCalendarOpen(false)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── RoutineSummary ───────────────────────────────────────────────────────────

export const RoutineSummary = ({ routines, selectedDate, onDateChange }: RoutineSummaryProps) => {
    const { t, i18n } = useTranslation();
    const locale = i18n.language || "en";

    const snapshotState = useSelector((state: RootState) => state.snapshot) || {
        snapshots: {},
        selectedDate: "",
        loading: false,
        snapshotDates: [],
    };

    const today = new Date().toISOString().split("T")[0];
    const isSnapshotMode = selectedDate < today && snapshotState.selectedDate === selectedDate;

    const allActiveDays = useMemo(() => {
        const daySet = new Set<string>();
        routines.forEach((routine) => {
            routine.schedule?.days?.forEach((day) => daySet.add(day));
        });
        return daySet.size;
    }, [routines]);

    return (
        <div
            className={`w-full rounded-card border bg-surface p-4 shadow-sm ${
                isSnapshotMode ? "border-border/40" : "border-border"
            }`}
        >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                {/* Title & subtitle */}
                <div className="text-center md:text-left">
                    {isSnapshotMode ? (
                        <span className="inline-flex items-center rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-text-2">
                            {t("Historical view")}
                        </span>
                    ) : (
                        <p className="text-[13px] text-text-3">
                            {t("RoutinesCount", { count: routines.length })} ·{" "}
                            {t("ActiveDaysThisWeek", { count: allActiveDays })}
                        </p>
                    )}
                </div>

                {/* Date picker: day chips + calendar */}
                <DatePickerBar
                    selectedDate={selectedDate}
                    today={today}
                    locale={locale}
                    isSnapshotMode={isSnapshotMode}
                    onDateChange={onDateChange}
                    t={t}
                />
            </div>

        </div>
    );
};

