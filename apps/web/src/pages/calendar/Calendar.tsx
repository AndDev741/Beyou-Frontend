import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { deleteCalendarTask, getCalendarOverview } from "@beyou/api/calendar/calendarApi";
import { getFriendlyErrorMessage } from "@beyou/api/apiError";
import {
    addDaysIso,
    dayFromOverview,
    firstOfMonth,
    isInMonth,
    isIsoDay,
    monthOfIso,
    rangeForView,
    removeTaskFromOverview,
    shiftMonth,
    upsertTaskInOverview,
    weekDaysOf,
    type CalendarView,
} from "@beyou/state";
import type { CalendarOverview, CalendarTask } from "@beyou/types/calendar/calendar";
import useAuthGuard from "../../components/useAuthGuard";
import useTodayInZone from "../../hooks/useTodayInZone";
import PageHeader from "../../ui/PageHeader";
import Button from "../../components/Button";
import Modal from "../../components/modals/Modal";
import CalendarMonthGrid from "../../components/calendar/CalendarMonthGrid";
import CalendarWeekView from "../../components/calendar/CalendarWeekView";
import CalendarDayPanel from "../../components/calendar/CalendarDayPanel";
import CalendarTaskDialog, { type CalendarTaskDialogState } from "../../components/calendar/CalendarTaskDialog";
import { useCalendarTaskToggle } from "../../components/calendar/useCalendarTaskToggle";
import { monthLabel, weekLabel } from "../../components/calendar/calendarFormat";
import { requestReminderResync } from "../../components/calendar/reminderPreferenceBus";
import { isCalendarTaskGone } from "../../components/calendar/calendarErrors";

const VIEW_KEY = "beyou-calendar-view";

function readStoredView(): CalendarView {
    try {
        return localStorage.getItem(VIEW_KEY) === "week" ? "week" : "month";
    } catch {
        return "month";
    }
}

type LoadStatus = "loading" | "ready" | "error";

/**
 * The Calendar: one-off dated tasks next to each day's routine, goal deadlines and mood.
 *
 * The day on screen lives in the URL (`?date=`), so a reminder notification or a reminder email
 * can open the page on the task's day, and a click on a notification while the page is already
 * open moves it there too. Data is fetched per visible range and kept in local state (KTD8): the
 * page applies its own writes to the fetched overview rather than asking for the range again.
 */
export default function Calendar() {
    useAuthGuard();

    const { t, i18n } = useTranslation();
    const clientToday = useTodayInZone();
    const [params, setParams] = useSearchParams();
    const requested = params.get("date");
    const selected = isIsoDay(requested) ? requested : clientToday;

    const [view, setView] = useState<CalendarView>(readStoredView);
    const [overview, setOverview] = useState<CalendarOverview | null>(null);
    /** The browser's today when the overview on screen was asked for. */
    const [fetchedOn, setFetchedOn] = useState<string | null>(null);
    const [status, setStatus] = useState<LoadStatus>("loading");
    const [reload, setReload] = useState(0);
    const [dialog, setDialog] = useState<CalendarTaskDialogState>(null);
    const [deleting, setDeleting] = useState<CalendarTask | null>(null);
    const [deletingBusy, setDeletingBusy] = useState(false);
    const deleteTitleId = useId();
    const { toggle, pending } = useCalendarTaskToggle();

    // The server's today wins once it is known: it resolves the day in the user's own zone, which
    // is what every date in the overview is keyed by. But only while it answers for the same day
    // the clock shows: in a tab left open overnight, the last overview's today is yesterday, and
    // the today ring, the "not done" marks and the Today button would all stay there.
    // `useTodayInZone` re-renders at midnight, which also refetches below.
    const today = overview && fetchedOn === clientToday ? overview.today : clientToday;

    useEffect(() => {
        try {
            localStorage.setItem(VIEW_KEY, view);
        } catch {
            /* storage unavailable: the view lasts only for this visit */
        }
    }, [view]);

    const range = useMemo(() => rangeForView(view, selected), [view, selected]);

    // `t` is read through a ref so a language switch does not refetch the same range.
    const tRef = useRef(t);
    tRef.current = t;

    useEffect(() => {
        let active = true;
        const askedOn = clientToday;
        setStatus("loading");
        void (async () => {
            const response = await getCalendarOverview(range, tRef.current);
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
    }, [range.from, range.to, reload, clientToday]);

    const selectDay = useCallback(
        (day: string) => {
            const next = new URLSearchParams(params);
            next.set("date", day);
            setParams(next, { replace: true });
        },
        [params, setParams],
    );

    const cursor = useMemo(() => monthOfIso(selected), [selected]);
    const weekDays = useMemo(() => weekDaysOf(selected), [selected]);

    /** A month away lands on its first day, or on today when today is in it. */
    const step = (delta: number) => {
        if (view === "week") {
            selectDay(addDaysIso(selected, delta * 7));
            return;
        }
        const target = shiftMonth(cursor, delta);
        selectDay(isInMonth(today, target) ? today : firstOfMonth(target));
    };

    /** Drops a task the server no longer has (deleted on another device). */
    const dropTask = (id: string) => {
        setOverview((current) => (current ? removeTaskFromOverview(current, id) : current));
        requestReminderResync();
    };

    /** Keeps the fetched range in step with a write, and follows a task moved to another day. */
    const applySaved = (task: CalendarTask) => {
        setOverview((current) => (current ? upsertTaskInOverview(current, task) : current));
        if (task.date !== selected) selectDay(task.date);
        // A new or moved reminder may be due before the hub's next poll.
        requestReminderResync();
    };

    const handleToggle = async (task: CalendarTask) => {
        const outcome = await toggle(task);
        if (outcome.kind === "updated") {
            setOverview((current) => (current ? upsertTaskInOverview(current, outcome.task) : current));
        } else if (outcome.kind === "gone") {
            setOverview((current) => (current ? removeTaskFromOverview(current, outcome.id) : current));
        }
    };

    const confirmDelete = async () => {
        const task = deleting;
        if (!task || deletingBusy) return;
        setDeletingBusy(true);
        const response = await deleteCalendarTask(task.id, t);
        setDeletingBusy(false);
        // Already deleted elsewhere is still deleted: same outcome, a different word for it.
        const gone = isCalendarTaskGone(response.error);
        if (response.success || gone) {
            setDeleting(null);
            dropTask(task.id);
            if (gone) toast.info(t("CALENDAR_TASK_NOT_FOUND"));
            else toast.success(t("CalendarTaskDeleted"));
            return;
        }
        toast.error(getFriendlyErrorMessage(t, response.error));
    };

    const openTask = (task: CalendarTask) => {
        if (task.date !== selected) selectDay(task.date);
        setDialog({ mode: "edit", task });
    };

    const day = dayFromOverview(overview, selected);
    const loading = status === "loading";
    const periodLabel = view === "month" ? monthLabel(i18n.language, cursor) : weekLabel(i18n.language, weekDays);

    const panel = (
        <CalendarDayPanel
            day={day}
            today={today}
            loading={loading}
            pending={pending}
            onToggle={handleToggle}
            onEdit={(task) => setDialog({ mode: "edit", task })}
            onDelete={setDeleting}
            onAdd={(date) => setDialog({ mode: "create", date })}
        />
    );

    const viewButton = (value: CalendarView, label: string) => (
        <button
            type="button"
            onClick={() => setView(value)}
            aria-pressed={view === value}
            data-testid={`calendar-view-${value}`}
            className={`rounded-[7px] px-3.5 py-1.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                view === value ? "bg-surface text-accent shadow-sm" : "text-text-3 hover:text-text-2"
            }`}
        >
            {label}
        </button>
    );

    const navButton =
        "flex h-9 items-center justify-center rounded-control border border-border text-text-2 transition-colors duration-200 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

    return (
        <div className="min-h-[calc(100vh-5rem)] w-full bg-bg px-4 py-6 text-text lg:min-h-[calc(100vh-6rem)] lg:px-7">
            <PageHeader
                title={t("Calendar")}
                action={
                    <Button
                        text={t("CalendarNewTask")}
                        mode="primary"
                        size="auto"
                        icon={<Plus size={15} />}
                        onClick={() => setDialog({ mode: "create", date: selected })}
                        testId="calendar-new-task"
                    />
                }
            />

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2
                    className="min-w-0 text-base font-semibold tracking-[-0.01em] text-text first-letter:uppercase"
                    data-testid="calendar-period"
                    aria-live="polite"
                >
                    {periodLabel}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                    <div
                        role="group"
                        aria-label={t("CalendarViewLabel")}
                        className="inline-flex rounded-control border border-border bg-surface-2 p-[3px]"
                    >
                        {viewButton("month", t("CalendarMonthView"))}
                        {viewButton("week", t("CalendarWeekView"))}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => step(-1)}
                            aria-label={t("CalendarPrevious")}
                            data-testid="calendar-previous"
                            className={`${navButton} w-9`}
                        >
                            <ChevronLeft size={16} aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={() => selectDay(today)}
                            data-testid="calendar-today"
                            className={`${navButton} px-3 text-[13px] font-semibold`}
                        >
                            {t("CalendarToday")}
                        </button>
                        <button
                            type="button"
                            onClick={() => step(1)}
                            aria-label={t("CalendarNext")}
                            data-testid="calendar-next"
                            className={`${navButton} w-9`}
                        >
                            <ChevronRight size={16} aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>

            {status === "error" && (
                <div
                    role="alert"
                    className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-danger/30 bg-danger/10 px-4 py-3 text-[13px] text-danger"
                    data-testid="calendar-load-error"
                >
                    <span>{t("CalendarLoadFailed")}</span>
                    <Button text={t("TryAgain")} mode="ghost" size="small" onClick={() => setReload((n) => n + 1)} />
                </div>
            )}

            {view === "month" ? (
                // The panel beside the grid from lg, under it below that.
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
                    <CalendarMonthGrid
                        cursor={cursor}
                        selected={selected}
                        today={today}
                        overview={overview}
                        onSelect={selectDay}
                    />
                    {panel}
                </div>
            ) : (
                // The week needs the width, so its day panel always sits underneath.
                <div className="flex flex-col gap-4">
                    <CalendarWeekView
                        days={weekDays}
                        selected={selected}
                        today={today}
                        overview={overview}
                        onSelect={selectDay}
                        onOpenTask={openTask}
                    />
                    {panel}
                </div>
            )}

            <CalendarTaskDialog
                state={dialog}
                onClose={() => setDialog(null)}
                onSaved={applySaved}
                onGone={dropTask}
            />

            {/* The shared DeleteModal is bound to the four entity domains (an edit slice and a
                list refetch per domain); a calendar task has neither. Same base Modal, so the focus
                trap, Escape and aria-labelledby behave the same. */}
            <Modal
                isOpen={deleting !== null}
                onClose={() => setDeleting(null)}
                labelledBy={deleteTitleId}
                className="max-w-md"
            >
                <h2 id={deleteTitleId} className="text-[15px] font-semibold tracking-[-0.01em] text-text">
                    {t("CalendarTaskDeleteConfirm")}
                </h2>
                <p className="mt-1.5 text-[12.5px] leading-snug text-text-2">
                    {deleting && t("DeleteWillRemove", { name: deleting.title })}
                </p>
                <div className="mt-4 flex justify-end gap-2">
                    <Button text={t("Cancel")} mode="ghost" size="medium" type="button" onClick={() => setDeleting(null)} />
                    <Button
                        text={t("Delete")}
                        mode="danger"
                        size="medium"
                        type="button"
                        onClick={confirmDelete}
                        disabled={deletingBusy}
                        testId="calendar-task-delete-confirm"
                    />
                </div>
            </Modal>
        </div>
    );
}
