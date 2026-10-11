import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { getCalendarOverview } from "@beyou/api/calendar/calendarApi";
import { addDaysIso, dayFromOverview, removeTaskFromOverview, upsertTaskInOverview } from "@beyou/state";
import type { CalendarOverview, CalendarTask } from "@beyou/types/calendar/calendar";
import BaseDiv from "./baseDiv";
import Ring from "../../ui/Ring";
import useTodayInZone from "../../hooks/useTodayInZone";
import { useCalendarTaskToggle } from "../calendar/useCalendarTaskToggle";

/**
 * "Today in the calendar" (R18): the day's calendar tasks with a checkbox each, and the way into
 * the Calendar. Off until the person adds it in the widget settings; nothing puts it in a default
 * list, because calendar tasks stay on the Calendar page unless somebody asks.
 *
 * It asks for a three-day window around today in the profile's zone and then reads the day the
 * SERVER calls today, so the day matches what the Calendar page shows. The server's answer only
 * counts for the day it was asked on: past midnight the widget moves to the new day at once,
 * the same rule as the Calendar page, and refetches.
 */
export default function CalendarToday() {
    const { t } = useTranslation();
    const clientToday = useTodayInZone();
    const [overview, setOverview] = useState<CalendarOverview | null>(null);
    /** The day the overview on screen was asked for. */
    const [fetchedOn, setFetchedOn] = useState<string | null>(null);
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
    const { toggle, pending } = useCalendarTaskToggle();
    const tRef = useRef(t);
    tRef.current = t;

    useEffect(() => {
        let active = true;
        const askedOn = clientToday;
        setStatus("loading");
        void (async () => {
            const response = await getCalendarOverview(
                { from: addDaysIso(clientToday, -1), to: addDaysIso(clientToday, 1) },
                tRef.current,
            );
            if (!active) return;
            if (response.success) {
                setOverview(response.success);
                setFetchedOn(askedOn);
                setStatus("ready");
            } else {
                setStatus("error");
            }
        })();
        return () => {
            active = false;
        };
    }, [clientToday]);

    const today = overview && fetchedOn === clientToday ? overview.today : clientToday;
    const tasks = useMemo(() => dayFromOverview(overview, today).tasks, [overview, today]);

    const onToggle = async (task: CalendarTask) => {
        const outcome = await toggle(task);
        if (outcome.kind === "updated") {
            setOverview((current) => (current ? upsertTaskInOverview(current, outcome.task) : current));
        } else if (outcome.kind === "gone") {
            // Deleted on another device: the hook already said so.
            setOverview((current) => (current ? removeTaskFromOverview(current, outcome.id) : current));
        }
    };

    return (
        <div data-testid="calendar-today-widget">
            <BaseDiv
                title={t("CalendarTodayWidget")}
                icon={<CalendarClock size={14.5} aria-hidden="true" />}
                action={
                    <Link
                        to={`/calendar?date=${today}`}
                        className="text-[11.5px] font-medium hover:text-text-2"
                        data-testid="calendar-today-open"
                    >
                        {t("CalendarOpen")}
                    </Link>
                }
            >
                {status === "loading" && !overview ? (
                    <div className="mt-3 flex flex-col gap-2" aria-hidden="true">
                        <span className="h-7 animate-pulse rounded-control bg-surface-2" />
                        <span className="h-7 animate-pulse rounded-control bg-surface-2" />
                    </div>
                ) : status === "error" && !overview ? (
                    <p className="mt-3 text-[12px] text-text-3">{t("CalendarLoadFailed")}</p>
                ) : tasks.length === 0 ? (
                    <p className="mt-3 text-[12px] text-text-3" data-testid="calendar-today-empty">
                        {t("CalendarTodayWidgetEmpty")}
                    </p>
                ) : (
                    <ul className="mt-2.5 flex flex-col gap-1">
                        {tasks.map((task) => (
                            <li
                                key={task.id}
                                className="flex items-center gap-2"
                                data-testid={`calendar-today-task-${task.id}`}
                            >
                                <button
                                    type="button"
                                    onClick={() => void onToggle(task)}
                                    disabled={pending.has(task.id)}
                                    aria-pressed={task.completed}
                                    aria-label={`${t(task.completed ? "CalendarTaskUncomplete" : "CalendarTaskComplete")}: ${task.title}`}
                                    data-testid={`calendar-today-toggle-${task.id}`}
                                    className="-m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
                                >
                                    <Ring size={20} state={task.completed ? "done" : "todo"} />
                                </button>
                                <span
                                    className={`min-w-0 flex-1 truncate text-[12.5px] font-semibold ${
                                        task.completed ? "text-text-3 line-through" : "text-text"
                                    }`}
                                >
                                    {task.title}
                                </span>
                                <span className="shrink-0 font-mono text-[11px] text-text-3">
                                    {task.time ?? t("CalendarAllDay")}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </BaseDiv>
        </div>
    );
}
