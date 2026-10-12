import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { deleteStudySession, getStudyCycle, getStudyHistory } from "@beyou/api/notebook";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import { addDaysIso, enterStudyCycle, formatStudyMinutes, historyTotals, mondayOf, subjectLabel, weekFrom } from "@beyou/state";
import type { RootState } from "@beyou/state/rootReducer";
import type { HistoryEntry, StudyHistory, StudyHistoryDay } from "@beyou/types/notebook/studyCycle";
import ErrorNotice from "../../components/ErrorNotice";
import Modal from "../../components/modals/Modal";
import { RootPrefix, topicTone } from "../../components/notebook/cycles/BlockParts";
import { noonOf, sentenceCase } from "../../components/notebook/cycles/cycleFormat";
import { useRefreshStudyCycles } from "../../components/notebook/cycles/useStudyToday";
import useTodayInZone from "../../hooks/useTodayInZone";

/** Bars never shorter than an hour at full height, so a light week does not look full. */
const MIN_SCALE = 60;

/**
 * A cycle's history a week at a time: minutes per day stacked by topic against the day's target,
 * and a day's sessions, concepts understood and laps closed in the order they happened.
 *
 * Logged sessions can be deleted from here. Their minutes come back off the block they went to,
 * which the server does (contract 2.4); the screen only re-reads.
 */
export default function StudyCycleHistory() {
    const { t, i18n } = useTranslation();
    const dispatch = useDispatch();
    const refresh = useRefreshStudyCycles();
    const { cycleId = "" } = useParams();
    const today = useTodayInZone();
    const summary = useSelector((state: RootState) => state.studyCycles.list.find((cycle) => cycle.id === cycleId));
    const full = useSelector((state: RootState) => state.studyCycles.byId[cycleId]);
    const [monday, setMonday] = useState(() => mondayOf(today));
    const [history, setHistory] = useState<StudyHistory | null>(null);
    const [selected, setSelected] = useState<string | null>(null);
    const [error, setError] = useState<ApiErrorPayload | null>(null);
    const [reloads, setReloads] = useState(0);
    const [deleting, setDeleting] = useState<Extract<HistoryEntry, { kind: "MANUAL" }> | null>(null);
    const name = full?.name ?? summary?.name ?? "";

    useEffect(() => {
        if (name || !cycleId) return;
        void getStudyCycle(cycleId, t).then((response) => response.success && dispatch(enterStudyCycle(response.success)));
    }, [name, cycleId, t, dispatch]);

    const week = useMemo(() => weekFrom(monday), [monday]);

    useEffect(() => {
        let cancelled = false;
        void getStudyHistory(cycleId, week[0], week[6], t).then((response) => {
            if (cancelled) return;
            if (response.success) {
                setHistory(response.success);
                setError(null);
            } else {
                setError(response.error ?? {});
            }
        });
        return () => {
            cancelled = true;
        };
    }, [cycleId, week, reloads, t]);

    const days = useMemo(() => {
        const byDate = new Map((history?.days ?? []).map((day) => [day.date, day]));
        return week.map((date): StudyHistoryDay => byDate.get(date) ?? { date, plannedMinutes: 0, minutes: 0, byTopic: [], entries: [] });
    }, [history, week]);

    // The day on show: the one picked, else today when it is in this week, else the week's last
    // day with study, else its Monday.
    const shownDate = selected && week.includes(selected)
        ? selected
        : week.includes(today)
          ? today
          : [...days].reverse().find((day) => day.minutes > 0)?.date ?? week[0];
    const shown = days.find((day) => day.date === shownDate)!;

    const topicIndex = new Map((history?.topics ?? []).map((topic, index) => [topic.id, index]));
    const totals = history ? historyTotals(history) : { minutes: 0, planned: 0, understood: 0 };
    const scale = Math.max(MIN_SCALE, ...days.map((day) => Math.max(day.minutes, day.plannedMinutes)));
    const dayName = new Intl.DateTimeFormat(i18n.language, { weekday: "short", day: "numeric" });
    const dayLong = new Intl.DateTimeFormat(i18n.language, { weekday: "long", day: "numeric", month: "long" });
    const range = new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "long" });
    const clock = new Intl.DateTimeFormat(i18n.language, { hour: "2-digit", minute: "2-digit" });
    const nextMonday = addDaysIso(monday, 7);

    const removeSession = async () => {
        if (!deleting) return;
        const response = await deleteStudySession(deleting.sessionId, t);
        setDeleting(null);
        if (response.error) {
            setError(response.error);
            return;
        }
        setReloads((count) => count + 1);
        void refresh();
    };

    return (
        <div className="min-h-[calc(100vh-5rem)] w-full bg-bg px-4 py-6 text-text lg:min-h-[calc(100vh-6rem)] lg:px-7" data-testid="study-cycle-history">
            <div className="mx-auto flex max-w-[880px] flex-col gap-5">
                <Link to={`/notebook/cycles?cycle=${cycleId}`} className="inline-flex w-fit items-center gap-1 text-[13px] font-semibold text-text-2 hover:text-text">
                    <ChevronLeft size={15} aria-hidden="true" />{t("StudyCyclesTitle")}
                </Link>
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-text-2">{t("StudyHistoryEyebrow", { name })}</span>
                        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-text" data-testid="history-headline">
                            {t("StudyHistoryHeadline", {
                                count: totals.understood,
                                minutes: formatStudyMinutes(totals.minutes),
                                planned: formatStudyMinutes(totals.planned),
                            })}
                        </h1>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => setMonday(addDaysIso(monday, -7))} aria-label={t("StudyHistoryPreviousWeek")} data-testid="history-prev"
                            className="flex h-9 w-9 items-center justify-center rounded-control border border-border bg-surface text-text-2 hover:bg-surface-2">
                            <ChevronLeft size={16} aria-hidden="true" />
                        </button>
                        <span className="min-w-[150px] text-center text-sm font-semibold text-text">{range.formatRange(noonOf(week[0]), noonOf(week[6]))}</span>
                        <button type="button" onClick={() => setMonday(nextMonday)} disabled={nextMonday > today} aria-label={t("StudyHistoryNextWeek")} data-testid="history-next"
                            className="flex h-9 w-9 items-center justify-center rounded-control border border-border bg-surface text-text-2 hover:bg-surface-2 disabled:opacity-40">
                            <ChevronRight size={16} aria-hidden="true" />
                        </button>
                    </div>
                </header>
                <ErrorNotice error={error} />

                <section aria-label={t("StudyHistoryBarsLabel")} className="rounded-card border border-border bg-surface p-5">
                    <div className="grid grid-cols-7 gap-2">
                        {days.map((day) => {
                            const on = day.date === shownDate;
                            const label = day.plannedMinutes > 0
                                ? t("StudyHistoryDayOf", { minutes: formatStudyMinutes(day.minutes), planned: formatStudyMinutes(day.plannedMinutes) })
                                : day.minutes > 0 ? formatStudyMinutes(day.minutes) : t("StudyCycleRestDay");
                            return (
                                <button key={day.date} type="button" onClick={() => setSelected(day.date)} aria-pressed={on} data-testid="history-day"
                                    aria-label={`${dayLong.format(noonOf(day.date))}: ${label}`}
                                    className={`flex flex-col items-center gap-1.5 rounded-control px-1 pb-1.5 pt-2 ${on ? "bg-accent/5" : "hover:bg-surface-2"}`}>
                                    <span className="relative flex h-[160px] w-full max-w-[44px] flex-col-reverse gap-[2px]" aria-hidden="true">
                                        {day.byTopic.map((part) => (
                                            <span key={part.topicId} className={`w-full rounded-[3px] ${topicTone(topicIndex.get(part.topicId) ?? 0)}`}
                                                style={{ height: `${(part.minutes / scale) * 100}%` }} />
                                        ))}
                                        {day.plannedMinutes > 0 && (
                                            <span className="absolute inset-x-[-4px] border-t-2 border-dashed border-text-2"
                                                style={{ bottom: `${(day.plannedMinutes / scale) * 100}%` }} />
                                        )}
                                    </span>
                                    <span className={`text-xs font-semibold ${on ? "text-accent" : "text-text"}`}>{sentenceCase(dayName.format(noonOf(day.date)))}</span>
                                    <span className="text-center text-[11px] leading-tight text-text-2">{label}</span>
                                </button>
                            );
                        })}
                    </div>
                    {history && history.topics.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border pt-3 text-xs text-text-2" data-testid="history-legend">
                            {history.topics.map((topic, index) => (
                                <span key={topic.id} className="inline-flex items-center gap-1.5">
                                    <span className={`h-2.5 w-2.5 rounded-full ${topicTone(index)}`} aria-hidden="true" />
                                    <span><RootPrefix root={topic.rootTitle} className="text-text-3" />{topic.title}</span>
                                </span>
                            ))}
                            <span className="inline-flex items-center gap-1.5">
                                <span className="w-4 border-t-2 border-dashed border-text-2" aria-hidden="true" />{t("StudyHistoryDayTarget")}
                            </span>
                        </div>
                    )}
                </section>

                <section aria-labelledby="history-day-title" className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5" data-testid="history-day-entries">
                    <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                        <h2 id="history-day-title" className="text-base font-semibold text-text">{sentenceCase(dayLong.format(noonOf(shown.date)))}</h2>
                        <span className="text-[13px] text-text-2">
                            {shown.plannedMinutes > 0
                                ? t("StudyHistoryDayOf", { minutes: formatStudyMinutes(shown.minutes), planned: formatStudyMinutes(shown.plannedMinutes) })
                                : formatStudyMinutes(shown.minutes)}
                        </span>
                    </div>
                    {shown.entries.length === 0 && <p className="text-[13px] text-text-2">{t("StudyHistoryEmptyDay")}</p>}
                    {shown.entries.map((entry, index) => (
                        <EntryLine key={`${entry.kind}-${entry.at}-${index}`} entry={entry} time={clock.format(new Date(entry.at))}
                            tone={"topic" in entry ? topicTone(topicIndex.get(entry.topic.id) ?? 0) : ""}
                            onDelete={entry.kind === "MANUAL" ? () => setDeleting(entry) : undefined} />
                    ))}
                </section>
            </div>

            <Modal isOpen={deleting !== null} onClose={() => setDeleting(null)} labelledBy="delete-session-title">
                <div className="flex w-full flex-col gap-3">
                    <h2 id="delete-session-title" className="text-lg font-semibold text-text">
                        {t("StudyHistoryDeleteTitle", { minutes: formatStudyMinutes(deleting?.minutes ?? 0), topic: deleting ? subjectLabel(deleting.topic) : "" })}
                    </h2>
                    <p className="text-sm text-text-2">{t("StudyHistoryDeleteText")}</p>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setDeleting(null)} className="rounded-control px-4 py-2 text-sm font-semibold text-text-2 hover:bg-surface-2">{t("Cancel")}</button>
                        <button type="button" onClick={() => void removeSession()} data-testid="session-delete-confirm"
                            className="rounded-control bg-danger px-4 py-2 text-sm font-semibold text-on-accent">{t("Delete")}</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

function EntryLine({ entry, time, tone, onDelete }: { entry: HistoryEntry; time: string; tone: string; onDelete?: () => void }) {
    const { t } = useTranslation();
    if (entry.kind === "LAP_CLOSED") {
        return (
            <div className="my-1 flex items-center gap-3 text-xs font-semibold text-text-2" data-testid="history-lap-closed">
                <span className="h-px flex-1 bg-border" />
                {t("StudyHistoryLapClosed", { number: entry.lapNumber, time, next: entry.lapNumber + 1 })}
                <span className="h-px flex-1 bg-border" />
            </div>
        );
    }
    if (entry.kind === "UNDERSTOOD") {
        return (
            <div className="flex items-center gap-2 rounded-control bg-success/10 px-3 py-2 text-[13px] font-semibold text-success" data-testid="history-understood">
                <Check size={15} aria-hidden="true" />
                {t("StudyHistoryUnderstood", { title: entry.page?.title ?? entry.topic.title, minutes: formatStudyMinutes(entry.minutes) })}
            </div>
        );
    }
    const manual = entry.kind === "MANUAL";
    const detail = manual ? [entry.page?.title, entry.note].filter(Boolean).join(" · ") : entry.page?.title ?? "";
    return (
        <div className="flex items-center gap-3 border-b border-border py-2 last:border-b-0" data-testid="history-session" data-kind={entry.kind}>
            <span className="w-11 font-mono text-xs text-text-2">{time}</span>
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone}`} aria-hidden="true" />
            <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold text-text">
                    <RootPrefix root={entry.topic.rootTitle} className="text-xs" />{entry.topic.title}
                </span>
                {detail && <span className="truncate text-xs text-text-2">{detail}</span>}
            </span>
            <span className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold ${manual ? "bg-flame-soft text-flame" : "bg-accent-soft text-accent"}`}>
                {t(manual ? "StudyHistoryManual" : "StudyHistoryFocus")}
            </span>
            <span className="w-14 text-right font-mono text-[13px] font-semibold text-text">{formatStudyMinutes(entry.minutes)}</span>
            {onDelete ? (
                <button type="button" onClick={onDelete} data-testid="session-delete"
                    aria-label={t("StudyHistoryDeleteLabel", { topic: subjectLabel(entry.topic), time })}
                    className="rounded-md p-1.5 text-text-3 hover:bg-surface-2 hover:text-danger">
                    <Trash2 size={15} aria-hidden="true" />
                </button>
            ) : (
                <span className="w-[27px]" aria-hidden="true" />
            )}
        </div>
    );
}
