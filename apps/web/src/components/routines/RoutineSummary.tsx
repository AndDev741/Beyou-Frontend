import { useMemo, useState, useRef, useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Routine } from "@beyou/types/routine/routine";
import { RootState } from "@beyou/state/rootReducer";
import { FiCalendar, FiChevronLeft, FiChevronRight } from "react-icons/fi";

type RoutineSummaryProps = {
    routines: Routine[];
    selectedDate: string;
    onDateChange: (value: string) => void;
    /** The page's primary action (create routine), top right of the card. */
    action?: ReactNode;
};

/** Returns ISO date string YYYY-MM-DD for N days ago (0 = today). */
/** Returns the last 5 days including today, oldest→newest. */
/**
 * The last seven days, ENDING TODAY — today is always the last box and the one
 * selected by default.
 *
 * That keeps yesterday and the recent days one tap away, without the calendar. A
 * civil week (Mon→Sun) would put future days in the row on a Monday, and a future
 * day has no routine to look at.
 */
function getLastSevenDays(): string[] {
    const now = new Date();
    return Array.from({ length: 7 }, (_, index) => {
        const day = new Date(now);
        day.setDate(now.getDate() - (6 - index));
        return day.toISOString().split("T")[0];
    });
}

// ─── DayChip ──────────────────────────────────────────────────────────────────

interface DayChipProps {
    todayLabel: string;
    dateStr: string;
    isSelected: boolean;
    isToday: boolean;
    locale: string;
    isSnapshotMode: boolean;
    onClick: () => void;
}

function DayChip({ dateStr, isSelected, isToday, locale, isSnapshotMode, onClick, todayLabel }: DayChipProps) {
    // Parse at noon to avoid timezone day-shift issues
    const date = new Date(dateStr + "T12:00:00");

    const shortDay = new Intl.DateTimeFormat(locale, { weekday: "short" })
        .format(date)
        .replace(/\.$/, "")   // Portuguese adds a period: "seg." → "seg"
        .slice(0, 3);

    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={isSelected}
            aria-current={isToday ? "date" : undefined}
            className={`w-10 shrink-0 rounded-xl border py-2 text-center transition-colors duration-200 md:w-[58px] md:py-[9px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                isSelected
                    ? isSnapshotMode
                        ? "border-text-3 bg-surface-2"
                        : "border-accent bg-accent"
                    : "border-border bg-surface hover:border-text-3/60"
            }`}
        >
            <span
                className={`block font-mono text-[9px] font-medium uppercase tracking-[0.04em] md:text-[9.5px] ${
                    isSelected && !isSnapshotMode ? "text-on-accent" : "text-text-3"
                }`}
            >
                {/* Today announces itself by name, not by a subtle dot. */}
                {isToday ? todayLabel : shortDay}
            </span>
            <b
                className={`font-mono text-[13.5px] font-semibold md:text-[15px] ${
                    isSelected && !isSnapshotMode ? "text-on-accent" : "text-text"
                }`}
            >
                {date.getDate()}
            </b>
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
                                        ? "bg-surface-2 text-text font-bold ring-2 ring-border"
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

/** Width of a day box plus the gap, and the room the calendar button takes. */
const DAY_BOX = { compact: 40 + 6, full: 58 + 8 };
const CALENDAR_SLOT = { compact: 52 + 6, full: 118 + 8 };

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
    const rowRef = useRef<HTMLDivElement>(null);
    const week = useMemo(() => getLastSevenDays(), []);
    // How many days actually fit on screen. Without this the strip either
    // scrolled days out of sight or broke into two lines on a phone.
    const [visibleDays, setVisibleDays] = useState(7);

    useEffect(() => {
        const row = rowRef.current;
        if (!row || typeof ResizeObserver === "undefined") return;
        const measure = () => {
            const wide = window.matchMedia("(min-width: 712px)").matches;
            const box = wide ? DAY_BOX.full : DAY_BOX.compact;
            const free = row.clientWidth - (wide ? CALENDAR_SLOT.full : CALENDAR_SLOT.compact);
            setVisibleDays(Math.max(3, Math.min(7, Math.floor(free / box))));
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(row);
        return () => observer.disconnect();
    }, []);

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
    const isOlderDate = !week.includes(selectedDate);
    const formattedOlderDate = isOlderDate
        ? new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(
              new Date(selectedDate + "T12:00:00")
          )
        : null;

    const calendarBtnActive = calendarOpen || isOlderDate;

    return (
        <div ref={rowRef} className="flex items-center gap-1.5 md:gap-2">
            <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
                {/* The last days ending today — today is the last box and comes
                    selected. It shows only what fits: the rest lives in the calendar. */}
                {week.slice(week.length - visibleDays).map((dateStr) => (
                    <DayChip
                        key={dateStr}
                        dateStr={dateStr}
                        isSelected={selectedDate === dateStr}
                        isToday={dateStr === today}
                        locale={locale}
                        isSnapshotMode={isSnapshotMode}
                        todayLabel={t("Today")}
                        onClick={() => onDateChange(dateStr)}
                    />
                ))}
            </div>

            {/* The button sits OUTSIDE the strip: inside it, the overflow-x-auto
                clipped the calendar and it simply never showed. */}
            <div className="relative shrink-0">
                    <button
                        ref={triggerRef}
                        type="button"
                        onClick={() => setCalendarOpen((o) => !o)}
                        aria-expanded={calendarOpen}
                        aria-label={t("More dates")}
                        className={[
                            // Quiet on purpose: the week is the normal path; the
                            // calendar exists to reach older history. On a phone it
                            // becomes a column (icon over label) so it takes the
                            // width of a day box instead of a wide pill.
                            "flex shrink-0 flex-col items-center gap-0.5 whitespace-nowrap rounded-control px-1.5 py-1.5 text-[9px] font-medium leading-tight transition-colors duration-200 md:ml-1 md:w-auto md:flex-row md:gap-1.5 md:px-2.5 md:py-2 md:text-xs",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                            calendarBtnActive
                                ? "bg-surface-2 text-text"
                                : "text-text-3 hover:bg-surface-2 hover:text-text-2",
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
    );
}

// ─── RoutineSummary ───────────────────────────────────────────────────────────

export const RoutineSummary = ({ routines, selectedDate, onDateChange, action }: RoutineSummaryProps) => {
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
        <div className="w-full">
            {/* No card: title, context, action and picker sit straight on the page.
                The frame competed with the routine cards right below it and weighed
                down the first impression. */}
            <div className="flex items-center gap-3">
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold tracking-[-0.02em] text-text">
                        {t("Routines")}
                    </h1>
                    {isSnapshotMode ? (
                        <span className="mt-1 inline-flex items-center rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-text-2">
                            {t("Historical view")}
                        </span>
                    ) : (
                        <p className="mt-1 text-[13px] text-text-3">
                            {t("RoutinesCount", { count: routines.length })} ·{" "}
                            {t("ActiveDays", { count: allActiveDays })}
                        </p>
                    )}
                </div>

                {action && <div className="ml-auto shrink-0">{action}</div>}
            </div>

            <div className="mt-5">
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

