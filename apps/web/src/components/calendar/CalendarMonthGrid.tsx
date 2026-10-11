import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Trophy } from "lucide-react";
import { dayFromOverview, isInMonth, monthGridDays, type MonthCursor } from "@beyou/state";
import type { CalendarDay, CalendarOverview } from "@beyou/types/calendar/calendar";
import type { MoodLevel } from "@beyou/types/mood/mood";
import { MOOD_FACES } from "../mood/moodScale";
import { longDateLabel, weekdayHeads } from "./calendarFormat";

type Props = {
    cursor: MonthCursor;
    selected: string;
    today: string;
    overview: CalendarOverview | null;
    onSelect: (day: string) => void;
};

/**
 * The month as whole Sunday-first weeks. Padding days belong to the neighbouring months and stay
 * clickable (the overview covers them too), drawn dimmer so the month itself reads first.
 */
export default function CalendarMonthGrid({ cursor, selected, today, overview, onSelect }: Props) {
    const { t, i18n } = useTranslation();
    const days = useMemo(() => monthGridDays(cursor), [cursor]);
    const heads = weekdayHeads(i18n.language, "narrow");

    return (
        <section className="min-w-0 rounded-card border border-border bg-surface p-2 sm:p-4">
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1" data-testid="calendar-month">
                {heads.map((head, index) => (
                    <span
                        key={`head-${index}`}
                        aria-hidden="true"
                        className="pb-1 text-center text-[10.5px] font-semibold uppercase text-text-3"
                    >
                        {head}
                    </span>
                ))}
                {days.map((day) => {
                    const info = dayFromOverview(overview, day);
                    const inMonth = isInMonth(day, cursor);
                    const isToday = day === today;
                    const isSelected = day === selected;
                    const count = info.tasks.length;
                    const label = count > 0
                        ? `${longDateLabel(i18n.language, day)}, ${t("CalendarDayTasksCount", { count })}`
                        : longDateLabel(i18n.language, day);
                    return (
                        <button
                            key={day}
                            type="button"
                            onClick={() => onSelect(day)}
                            aria-label={label}
                            aria-current={isSelected ? "date" : undefined}
                            data-testid={`calendar-day-${day}`}
                            data-outside={inMonth ? undefined : "true"}
                            data-today={isToday ? "true" : undefined}
                            className={`flex min-h-[58px] min-w-0 flex-col items-center gap-1 rounded-control border px-0.5 py-1 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:min-h-[76px] sm:py-1.5 ${
                                isSelected ? "border-accent bg-surface-2" : "border-transparent hover:bg-surface-2"
                            } ${inMonth ? "" : "opacity-45"}`}
                        >
                            <span
                                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11.5px] font-semibold ${
                                    isToday ? "bg-accent text-on-accent" : inMonth ? "text-text" : "text-text-3"
                                }`}
                            >
                                {Number(day.slice(8))}
                            </span>
                            <DayMarkers day={info} today={today} />
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

/**
 * The small signs under a day number: how many tasks, whether a routine sits there, a goal
 * deadline, and the mood face. Hidden from assistive tech; the cell's label carries the count
 * and the day panel says the rest in words.
 */
function DayMarkers({ day, today }: { day: CalendarDay; today: string }) {
    const tasks = day.tasks;
    const open = tasks.filter((task) => !task.completed).length;
    const missed = open > 0 && day.date < today;
    const routine = day.routines[0];
    const face = day.mood ? MOOD_FACES[day.mood.level as MoodLevel] : undefined;
    const FaceIcon = face?.Icon;

    const taskTone =
        tasks.length > 0 && open === 0
            ? "bg-success/15 text-success"
            : missed
              ? "bg-danger/10 text-danger"
              : "bg-accent-soft text-accent";

    const routineTone = !routine
        ? ""
        : routine.source === "SCHEDULE"
          ? "bg-text-3"
          : day.routines.every((item) => item.completed)
            ? "bg-success"
            : "bg-accent";

    return (
        <span className="flex max-w-full flex-wrap items-center justify-center gap-0.5" aria-hidden="true">
            {tasks.length > 0 && (
                <span
                    data-testid="calendar-marker-tasks"
                    className={`rounded-full px-1.5 font-mono text-[10px] font-semibold leading-4 ${taskTone}`}
                >
                    {tasks.length}
                </span>
            )}
            {routine && (
                <span data-testid="calendar-marker-routine" className={`h-1.5 w-1.5 rounded-full ${routineTone}`} />
            )}
            {day.goals.length > 0 && (
                <span data-testid="calendar-marker-goal" className="text-flame">
                    <Trophy size={11} />
                </span>
            )}
            {FaceIcon && face && (
                <span data-testid="calendar-marker-mood" className={face.text}>
                    <FaceIcon size={12} />
                </span>
            )}
        </span>
    );
}
