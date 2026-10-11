import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Bell, BookHeart, Check, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { moodLabelKey } from "@beyou/state";
import type { CalendarDay, CalendarRoutineDay, CalendarTask } from "@beyou/types/calendar/calendar";
import type { MoodLevel } from "@beyou/types/mood/mood";
import Button from "../Button";
import IconButton from "../../ui/IconButton";
import IconTile from "../../ui/IconTile";
import BeyouIcon from "../../ui/BeyouIcon";
import Ring from "../../ui/Ring";
import { MOOD_FACES } from "../mood/moodScale";
import { advanceLabel, longDateLabel } from "./calendarFormat";

type Props = {
    day: CalendarDay;
    /** The user's today, so a past task left open can say it was not done. */
    today: string;
    /** True while the range holding this day is still on its way. */
    loading: boolean;
    pending: ReadonlySet<string>;
    onToggle: (task: CalendarTask) => void;
    onEdit: (task: CalendarTask) => void;
    onDelete: (task: CalendarTask) => void;
    onAdd: (date: string) => void;
};

const SECTION_HEAD = "mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-3";

/**
 * Everything one day holds, in the order a person reads a day: what they set out to do, the
 * routine, deadlines, then how the day felt. Shared by the month and week views.
 */
export default function CalendarDayPanel({ day, today, loading, pending, onToggle, onEdit, onDelete, onAdd }: Props) {
    const { t, i18n } = useTranslation();
    const headingId = useId();
    const isEmpty =
        day.tasks.length === 0 && day.routines.length === 0 && day.goals.length === 0 && !day.mood;

    return (
        <section
            className="rounded-card border border-border bg-surface p-4 sm:p-5"
            aria-labelledby={headingId}
            data-testid="calendar-day-panel"
            data-date={day.date}
        >
            <div className="flex flex-wrap items-center gap-2">
                <h2 id={headingId} className="min-w-0 text-[15px] font-semibold tracking-[-0.01em] text-text">
                    {longDateLabel(i18n.language, day.date)}
                </h2>
                {day.date === today && (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                        {t("CalendarToday")}
                    </span>
                )}
            </div>

            <div className="mt-4 flex flex-col gap-4">
                {loading && isEmpty ? (
                    <div className="flex flex-col gap-2" aria-hidden="true">
                        <span className="h-10 animate-pulse rounded-control bg-surface-2" />
                        <span className="h-10 animate-pulse rounded-control bg-surface-2" />
                    </div>
                ) : isEmpty ? (
                    <p className="py-2 text-center text-[12.5px] text-text-3" data-testid="calendar-day-empty">
                        {t("CalendarDayEmpty")}
                    </p>
                ) : null}

                {day.tasks.length > 0 && (
                    <div>
                        <h3 className={SECTION_HEAD}>{t("Tasks")}</h3>
                        <ul className="flex flex-col gap-1.5">
                            {day.tasks.map((task) => (
                                <TaskRow
                                    key={task.id}
                                    task={task}
                                    overdue={!task.completed && task.date < today}
                                    busy={pending.has(task.id)}
                                    onToggle={onToggle}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                />
                            ))}
                        </ul>
                    </div>
                )}

                {day.routines.length > 0 && (
                    <div>
                        <h3 className={SECTION_HEAD}>{t("Routines")}</h3>
                        <ul className="flex flex-col gap-1.5">
                            {day.routines.map((routine) => (
                                <RoutineRow key={routine.routineId} routine={routine} />
                            ))}
                        </ul>
                    </div>
                )}

                {day.goals.length > 0 && (
                    <div>
                        <h3 className={SECTION_HEAD}>{t("Goals")}</h3>
                        <ul className="flex flex-col gap-1.5">
                            {day.goals.map((goal) => (
                                <li
                                    key={goal.goalId}
                                    data-testid={`calendar-goal-${goal.goalId}`}
                                    className="flex items-center gap-2.5"
                                >
                                    <IconTile size={28}>
                                        {goal.iconId ? (
                                            <BeyouIcon id={goal.iconId} size={14} showFallback />
                                        ) : (
                                            <Trophy size={14} aria-hidden="true" />
                                        )}
                                    </IconTile>
                                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-text">
                                        {goal.name}
                                    </span>
                                    <span
                                        className={`inline-flex shrink-0 items-center gap-1 text-[11.5px] ${
                                            goal.complete ? "text-success" : "text-flame"
                                        }`}
                                    >
                                        {goal.complete && <Check size={12} aria-hidden="true" />}
                                        {t("CalendarGoalEnds")}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {day.mood && <MoodRow date={day.date} level={day.mood.level} hasNote={day.mood.hasNote} />}

                <Button
                    text={t("CalendarAddTaskOnDay")}
                    mode="tonal"
                    size="auto"
                    icon={<Plus size={15} />}
                    onClick={() => onAdd(day.date)}
                    testId="calendar-add-task-on-day"
                    className="w-full"
                />
            </div>
        </section>
    );
}

function TaskRow({
    task,
    overdue,
    busy,
    onToggle,
    onEdit,
    onDelete,
}: {
    task: CalendarTask;
    overdue: boolean;
    busy: boolean;
    onToggle: (task: CalendarTask) => void;
    onEdit: (task: CalendarTask) => void;
    onDelete: (task: CalendarTask) => void;
}) {
    const { t } = useTranslation();
    return (
        <li
            data-testid={`calendar-task-${task.id}`}
            className="flex items-start gap-2 rounded-control border border-border px-2 py-2"
        >
            {/* The brand ring, the same one a routine check draws, so "done" looks the same
                everywhere. The button is the target; the ring is only its picture. */}
            <button
                type="button"
                onClick={() => onToggle(task)}
                disabled={busy}
                aria-pressed={task.completed}
                aria-label={`${t(task.completed ? "CalendarTaskUncomplete" : "CalendarTaskComplete")}: ${task.title}`}
                data-testid={`calendar-task-toggle-${task.id}`}
                className="-m-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
            >
                <Ring size={22} state={task.completed ? "done" : "todo"} />
            </button>

            <div className="min-w-0 flex-1 pt-0.5">
                <p
                    className={`break-words text-[13px] font-semibold ${
                        task.completed ? "text-text-3 line-through" : "text-text"
                    }`}
                >
                    {task.title}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-text-3">
                    <span className="font-mono">{task.time ?? t("CalendarAllDay")}</span>
                    {task.advanceMinutes > 0 && (
                        <span className="inline-flex items-center gap-1">
                            <Bell size={11} aria-hidden="true" />
                            {advanceLabel(t, task.advanceMinutes)}
                        </span>
                    )}
                    {overdue && (
                        <span
                            className="rounded-full bg-danger/10 px-1.5 py-px font-semibold text-danger"
                            data-testid={`calendar-task-not-done-${task.id}`}
                        >
                            {t("CalendarTaskNotDone")}
                        </span>
                    )}
                </div>
                {task.note && (
                    <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-[12px] text-text-2">
                        {task.note}
                    </p>
                )}
            </div>

            <div className="flex shrink-0 items-center">
                <IconButton
                    label={t("CalendarEditTask")}
                    onClick={() => onEdit(task)}
                    data-testid={`calendar-task-edit-${task.id}`}
                >
                    <Pencil size={14} aria-hidden="true" />
                </IconButton>
                <IconButton
                    label={t("Delete")}
                    tone="danger"
                    onClick={() => onDelete(task)}
                    data-testid={`calendar-task-delete-${task.id}`}
                >
                    <Trash2 size={14} aria-hidden="true" />
                </IconButton>
            </div>
        </li>
    );
}

/**
 * A routine line. A lived day shows how it went (7 of 9, or done); a day not lived yet only
 * says the routine is planned, because there is nothing to count.
 */
function RoutineRow({ routine }: { routine: CalendarRoutineDay }) {
    const { t } = useTranslation();
    const recorded = routine.source === "SNAPSHOT";
    const status = !recorded
        ? t("CalendarRoutinePlanned")
        : routine.completed
          ? t("CalendarRoutineCompleted")
          : t("CalendarRoutineProgress", {
                checked: routine.checkedItems ?? 0,
                total: routine.totalItems ?? 0,
            });
    return (
        <li data-testid={`calendar-routine-${routine.routineId}`} className="flex items-center gap-2.5">
            <IconTile size={28} tone={recorded ? "accent" : "neutral"}>
                <BeyouIcon id={routine.iconId} size={14} showFallback />
            </IconTile>
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-text">{routine.name}</span>
            <span
                className={`shrink-0 font-mono text-[11.5px] ${
                    recorded && routine.completed ? "text-success" : "text-text-3"
                }`}
                data-testid={`calendar-routine-status-${routine.routineId}`}
            >
                {status}
            </span>
        </li>
    );
}

function MoodRow({ date, level, hasNote }: { date: string; level: number; hasNote: boolean }) {
    const { t } = useTranslation();
    const face = MOOD_FACES[level as MoodLevel];
    if (!face) return null;
    const { Icon, text } = face;
    return (
        <div>
            <h3 className={SECTION_HEAD}>{t("CalendarMood")}</h3>
            {/* The diary page opens on this day: the calendar only shows that a note exists. */}
            <Link
                to={`/mood?date=${date}`}
                data-testid={`calendar-mood-${date}`}
                className="flex items-center gap-2.5 rounded-control px-1 py-1 transition-colors duration-200 hover:bg-surface-2"
            >
                <span className={text}>
                    <Icon size={22} aria-hidden="true" />
                </span>
                <span className="text-[13px] font-semibold text-text">{t(moodLabelKey(level as MoodLevel))}</span>
                {hasNote && (
                    <span
                        className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-text-3"
                        data-testid={`calendar-mood-diary-${date}`}
                    >
                        <BookHeart size={12} aria-hidden="true" />
                        {t("CalendarDiaryWritten")}
                    </span>
                )}
            </Link>
        </div>
    );
}
