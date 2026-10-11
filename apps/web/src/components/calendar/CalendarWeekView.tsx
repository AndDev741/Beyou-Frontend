import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Trophy } from "lucide-react";
import { dayFromOverview, hourOf, splitTasksByTime } from "@beyou/state";
import type { CalendarOverview, CalendarTask } from "@beyou/types/calendar/calendar";
import type { MoodLevel } from "@beyou/types/mood/mood";
import { MOOD_FACES } from "../mood/moodScale";
import { longDateLabel, weekdayShort } from "./calendarFormat";

type Props = {
    days: string[];
    selected: string;
    today: string;
    overview: CalendarOverview | null;
    onSelect: (day: string) => void;
    onOpenTask: (task: CalendarTask) => void;
};

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
/** Where the hour grid opens: early enough to show a morning, late enough to skip the night. */
const FIRST_VISIBLE_HOUR = 7;
const pad = (hour: number) => String(hour).padStart(2, "0");

/** A gutter for the hour labels, then seven equal days. */
const COLUMNS = "grid grid-cols-[2.75rem_repeat(7,minmax(0,1fr))]";

/**
 * Seven columns, Sunday to Saturday. Above the hours, an all-day strip per day holds what has no
 * time: untimed tasks, the routine, goal deadlines and the mood. Timed tasks sit in the row of
 * their hour.
 *
 * On a phone the seven columns keep a readable minimum width and the card scrolls sideways
 * inside itself, so the page never does.
 */
export default function CalendarWeekView({ days, selected, today, overview, onSelect, onOpenTask }: Props) {
    const { i18n, t } = useTranslation();
    const hoursRef = useRef<HTMLDivElement>(null);
    const firstHourRef = useRef<HTMLDivElement>(null);

    // Opens on the morning, not on midnight. Once per mount: moving to another week keeps the
    // scroll where the person left it.
    useEffect(() => {
        const container = hoursRef.current;
        const row = firstHourRef.current;
        if (container && row) container.scrollTop = row.offsetTop;
    }, []);

    /** Timed tasks by `date-HH`, so each cell finds its own without scanning the week. */
    const timedByCell = useMemo(() => {
        const cells = new Map<string, CalendarTask[]>();
        for (const day of days) {
            for (const task of splitTasksByTime(dayFromOverview(overview, day).tasks).timed) {
                const key = `${day}-${pad(hourOf(task.time ?? "00:00"))}`;
                cells.set(key, [...(cells.get(key) ?? []), task]);
            }
        }
        return cells;
    }, [days, overview]);

    return (
        <section className="min-w-0 overflow-hidden rounded-card border border-border bg-surface" data-testid="calendar-week">
            <div className="overflow-x-auto">
                <div className="min-w-[620px]">
                    <div className={`${COLUMNS} border-b border-border`}>
                        <span aria-hidden="true" />
                        {days.map((day) => {
                            const isToday = day === today;
                            const isSelected = day === selected;
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => onSelect(day)}
                                    aria-label={longDateLabel(i18n.language, day)}
                                    aria-current={isSelected ? "date" : undefined}
                                    data-testid={`calendar-week-day-${day}`}
                                    data-today={isToday ? "true" : undefined}
                                    className={`flex flex-col items-center py-2 transition-colors duration-200 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
                                        isSelected ? "bg-surface-2" : ""
                                    }`}
                                >
                                    <span className="text-[10.5px] font-semibold uppercase text-text-3">
                                        {weekdayShort(i18n.language, day)}
                                    </span>
                                    <span
                                        className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                                            isToday
                                                ? "bg-accent text-on-accent"
                                                : isSelected
                                                  ? "text-accent"
                                                  : "text-text"
                                        }`}
                                    >
                                        {Number(day.slice(8))}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className={`${COLUMNS} border-b border-border`}>
                        <span className="px-1 py-2 text-right text-[10px] leading-tight text-text-3">
                            {t("CalendarAllDay")}
                        </span>
                        {days.map((day) => {
                            const info = dayFromOverview(overview, day);
                            const { untimed } = splitTasksByTime(info.tasks);
                            const face = info.mood ? MOOD_FACES[info.mood.level as MoodLevel] : undefined;
                            const FaceIcon = face?.Icon;
                            return (
                                <div
                                    key={day}
                                    data-testid={`calendar-week-allday-${day}`}
                                    className={`flex min-h-[48px] min-w-0 flex-col gap-1 border-l border-border p-1 ${
                                        day === selected ? "bg-surface-2/60" : ""
                                    }`}
                                >
                                    {untimed.map((task) => (
                                        <TaskChip key={task.id} task={task} today={today} onOpen={onOpenTask} />
                                    ))}
                                    {info.routines.map((routine) => (
                                        <span
                                            key={routine.routineId}
                                            title={routine.name}
                                            className="truncate rounded-[6px] bg-surface-2 px-1.5 py-0.5 text-[10.5px] text-text-2"
                                        >
                                            {routine.name}
                                            {routine.source === "SNAPSHOT" && routine.totalItems !== null && (
                                                <span className="ml-1 font-mono text-text-3">
                                                    {routine.checkedItems ?? 0}/{routine.totalItems}
                                                </span>
                                            )}
                                        </span>
                                    ))}
                                    {info.goals.map((goal) => (
                                        <span
                                            key={goal.goalId}
                                            title={goal.name}
                                            className="flex min-w-0 items-center gap-1 text-[10.5px] text-flame"
                                        >
                                            <Trophy size={10} aria-hidden="true" className="shrink-0" />
                                            <span className="truncate">{goal.name}</span>
                                        </span>
                                    ))}
                                    {FaceIcon && face && (
                                        <span className={face.text} aria-hidden="true">
                                            <FaceIcon size={14} />
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div ref={hoursRef} className="relative max-h-[60vh] overflow-y-auto" data-testid="calendar-week-hours">
                        {HOURS.map((hour) => (
                            <div
                                key={hour}
                                ref={hour === FIRST_VISIBLE_HOUR ? firstHourRef : undefined}
                                className={COLUMNS}
                            >
                                <span className="pr-1.5 pt-0.5 text-right font-mono text-[10px] text-text-3">
                                    {pad(hour)}:00
                                </span>
                                {days.map((day) => (
                                    <div
                                        key={day}
                                        data-testid={`calendar-week-cell-${day}-${pad(hour)}`}
                                        className={`flex min-h-[44px] min-w-0 flex-col gap-0.5 border-l border-t border-border p-0.5 ${
                                            day === selected ? "bg-surface-2/40" : ""
                                        }`}
                                    >
                                        {(timedByCell.get(`${day}-${pad(hour)}`) ?? []).map((task) => (
                                            <TaskChip key={task.id} task={task} today={today} onOpen={onOpenTask} />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

function TaskChip({ task, today, onOpen }: { task: CalendarTask; today: string; onOpen: (task: CalendarTask) => void }) {
    const missed = !task.completed && task.date < today;
    const tone = task.completed
        ? "bg-surface-2 text-text-3 line-through"
        : missed
          ? "bg-danger/10 text-danger"
          : "bg-accent-soft text-accent";
    return (
        <button
            type="button"
            onClick={() => onOpen(task)}
            title={task.time ? `${task.time} ${task.title}` : task.title}
            data-testid={`calendar-week-task-${task.id}`}
            className={`w-full truncate rounded-[6px] px-1.5 py-0.5 text-left text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${tone}`}
        >
            {task.time && <span className="mr-1 font-mono font-normal">{task.time}</span>}
            {task.title}
        </button>
    );
}
