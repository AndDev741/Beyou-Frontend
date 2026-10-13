import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Archive, ChevronDown, ChevronLeft, ChevronUp, History, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { archiveStudyCycle, deleteStudyCycle, getStudyCycle, getStudyCycles, replaceStudyBlocks } from "@beyou/api/notebook";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import {
    blockDetail, blockFigure, blockTitle, blockTitleRoot, conceptUndecided, currentEntry, detailText, enterStudyCycle, enterStudyCycles, factsOfBlock,
    formatStudyMinutes, lapBlockStateLabelKey, lapShare, moveBlock, nextBlockOfTopic, orderedDays, removeStudyCycle,
    subjectLabel, weekMinutes,
} from "@beyou/state";
import type { RootState } from "@beyou/state/rootReducer";
import type { LapSummary, StudyBlock, StudyCycle, TodayEntry, Weekday } from "@beyou/types/notebook/studyCycle";
import PageHeader from "../../ui/PageHeader";
import EmptyState from "../../components/EmptyState";
import ErrorNotice from "../../components/ErrorNotice";
import Modal from "../../components/modals/Modal";
import BlockDialog from "../../components/notebook/cycles/BlockDialog";
import LogSessionDialog from "../../components/notebook/cycles/LogSessionDialog";
import { BlockFigureView, BlockMarker, ModeChip, RootPrefix } from "../../components/notebook/cycles/BlockParts";
import { useRefreshStudyCycles, useStudyToday } from "../../components/notebook/cycles/useStudyToday";
import { sentenceCase, weekdayNames } from "../../components/notebook/cycles/cycleFormat";

/**
 * The study cycles: one active cycle at a time (chips to switch), its lap so far, the ordered
 * block list, and the week beside it.
 *
 * The selected cycle lives in the address (`?cycle=`), so the editor and the history can send the
 * person back to the cycle they came from.
 */
export default function StudyCycles() {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [params, setParams] = useSearchParams();
    const list = useSelector((state: RootState) => state.studyCycles.list);
    const byId = useSelector((state: RootState) => state.studyCycles.byId);
    const { today } = useStudyToday();
    const refresh = useRefreshStudyCycles();
    const [listLoaded, setListLoaded] = useState(false);
    const [error, setError] = useState<ApiErrorPayload | null>(null);
    const [editing, setEditing] = useState<StudyBlock | null>(null);
    const [logging, setLogging] = useState(false);
    // Archive keeps the cycle's history; delete takes the cycle and everything under it.
    const [ending, setEnding] = useState<"archive" | "delete" | null>(null);
    const [moving, setMoving] = useState(false);

    useEffect(() => {
        void getStudyCycles(t).then((response) => {
            if (response.success) dispatch(enterStudyCycles(response.success));
            else setError(response.error ?? {});
            setListLoaded(true);
        });
    }, [t, dispatch]);

    const asked = params.get("cycle");
    // A cycle in the address that is no longer active (archived on the phone, say) falls back to
    // the first one rather than leaving the screen empty.
    const selectedId = asked && (!listLoaded || list.some((summary) => summary.id === asked)) ? asked : list[0]?.id ?? null;
    const cycle = selectedId ? byId[selectedId] : undefined;

    useEffect(() => {
        if (!selectedId) return;
        void getStudyCycle(selectedId, t).then((response) => {
            if (response.success) dispatch(enterStudyCycle(response.success));
            else setError(response.error ?? {});
        });
    }, [selectedId, t, dispatch]);

    const select = (id: string) => setParams({ cycle: id }, { replace: true });

    const saved = (next: StudyCycle) => {
        dispatch(enterStudyCycle(next));
        void refresh();
    };

    const move = async (block: StudyBlock, step: -1 | 1) => {
        if (!cycle || moving) return;
        const blocks = moveBlock(cycle.blocks, block.id, step);
        if (!blocks) return;
        setMoving(true);
        const response = await replaceStudyBlocks(cycle.id, blocks, t);
        setMoving(false);
        if (response.success) saved(response.success);
        else setError(response.error ?? {});
    };

    const end = async () => {
        if (!cycle || !ending) return;
        const response = ending === "archive" ? await archiveStudyCycle(cycle.id, t) : await deleteStudyCycle(cycle.id, t);
        setEnding(null);
        if (response.error) {
            setError(response.error);
            return;
        }
        dispatch(removeStudyCycle(cycle.id));
        setParams({}, { replace: true });
        void refresh();
    };

    const todayCycle = cycle ? today?.cycles.find((candidate) => candidate.cycleId === cycle.id) ?? null : null;

    return (
        <div className="min-h-[calc(100vh-5rem)] w-full bg-bg px-4 py-6 text-text lg:min-h-[calc(100vh-6rem)] lg:px-7" data-testid="study-cycles">
            <Link to="/notebook" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-text-2 hover:text-text">
                <ChevronLeft size={15} aria-hidden="true" />{t("Notebook")}
            </Link>
            <PageHeader
                title={t("StudyCyclesTitle")}
                subtitle={t("StudyCyclesSubtitle")}
                action={
                    <div className="flex flex-wrap gap-2">
                        {cycle && (
                            <Link to={`/notebook/cycles/${cycle.id}/history`} data-testid="cycle-history"
                                className="inline-flex h-10 items-center gap-2 rounded-control border border-border bg-surface px-3.5 text-sm font-semibold text-text hover:bg-surface-2">
                                <History size={16} aria-hidden="true" />{t("StudyCycleHistory")}
                            </Link>
                        )}
                        {list.length > 0 && (
                            <button type="button" onClick={() => setLogging(true)} data-testid="cycle-log-session"
                                className="inline-flex h-10 items-center gap-2 rounded-control bg-accent-soft px-3.5 text-sm font-semibold text-accent">
                                <Plus size={16} aria-hidden="true" />{t("StudySessionTitle")}
                            </button>
                        )}
                        <Link to="/notebook/cycles/new" data-testid="cycle-new"
                            className="inline-flex h-10 items-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-on-accent">
                            <Plus size={16} aria-hidden="true" />{t("StudyCycleNew")}
                        </Link>
                    </div>
                }
            />
            <ErrorNotice error={error} className="mb-4" />

            {listLoaded && list.length === 0 ? (
                <EmptyState
                    icon={<Repeat size={22} aria-hidden="true" />}
                    title={t("StudyCyclesEmptyTitle")}
                    description={t("StudyCyclesEmptyText")}
                    actionLabel={t("StudyCycleInviteAction")}
                    actionTo="/notebook/cycles/new"
                    testId="study-cycles-empty"
                />
            ) : (
                <>
                    {list.length > 1 && (
                        <nav aria-label={t("StudyCyclesActive")} className="mb-5 flex flex-wrap gap-2">
                            {list.map((summary) => {
                                const on = summary.id === selectedId;
                                return (
                                    <button key={summary.id} type="button" aria-pressed={on} onClick={() => select(summary.id)} data-testid="cycle-chip"
                                        className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold ${
                                            on ? "border-text bg-text text-surface" : "border-border bg-surface text-text hover:bg-surface-2"
                                        }`}>
                                        {summary.name}
                                        <span className={`font-mono text-xs ${on ? "text-surface/70" : "text-text-3"}`}>
                                            {summary.lap.blocksClosed}/{summary.lap.blocks}
                                        </span>
                                    </button>
                                );
                            })}
                        </nav>
                    )}

                    {!cycle ? (
                        <p className="text-sm text-text-2">{t("NotebookLoading")}</p>
                    ) : (
                        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                            <main className="flex min-w-0 flex-col gap-4">
                                <LapCard cycle={cycle} onArchive={() => setEnding("archive")} onDelete={() => setEnding("delete")} />
                                <section aria-label={t("StudyCycleBlocks")} className="flex flex-col gap-2" data-testid="cycle-blocks">
                                    {cycle.blocks.map((block, index) => (
                                        <BlockRow key={block.id} cycle={cycle} block={block} today={todayCycle}
                                            first={index === 0} last={index === cycle.blocks.length - 1} moving={moving}
                                            onOpen={() => setEditing(block)} onMove={(step) => void move(block, step)} />
                                    ))}
                                </section>
                            </main>
                            <aside className="flex flex-col gap-4">
                                <WeekCard cycle={cycle} todayWeekday={today?.weekday ?? null} />
                                {cycle.previousLaps.length > 0 && <PreviousLaps laps={cycle.previousLaps} />}
                            </aside>
                        </div>
                    )}
                </>
            )}

            {cycle && <BlockDialog cycle={cycle} block={editing} onClose={() => setEditing(null)} onSaved={saved} />}
            <LogSessionDialog isOpen={logging} onClose={() => setLogging(false)}
                defaultTopicId={todayCycle ? currentEntry(todayCycle)?.topic.id ?? null : cycle?.topics[0]?.topicId ?? null} />
            <Modal isOpen={ending !== null} onClose={() => setEnding(null)} labelledBy="end-cycle-title">
                <div className="flex w-full flex-col gap-3">
                    <h2 id="end-cycle-title" className="text-lg font-semibold text-text">
                        {t(ending === "delete" ? "StudyCycleDeleteTitle" : "StudyCycleArchiveTitle", { name: cycle?.name ?? "" })}
                    </h2>
                    <p className="text-sm text-text-2">{t(ending === "delete" ? "StudyCycleDeleteText" : "StudyCycleArchiveText")}</p>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setEnding(null)} className="rounded-control px-4 py-2 text-sm font-semibold text-text-2 hover:bg-surface-2">
                            {t("Cancel")}
                        </button>
                        <button type="button" onClick={() => void end()} data-testid={ending === "delete" ? "cycle-delete-confirm" : "cycle-archive-confirm"}
                            className="rounded-control bg-danger px-4 py-2 text-sm font-semibold text-on-accent">
                            {t(ending === "delete" ? "StudyCycleDelete" : "StudyCycleArchive")}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

function useDateFormat() {
    const { i18n } = useTranslation();
    return {
        long: new Intl.DateTimeFormat(i18n.language, { weekday: "long", day: "numeric", month: "long" }),
        range: new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "long" }),
    };
}

/** The lap so far: how many blocks closed, what was understood, how much time went in. */
function LapCard({ cycle, onArchive, onDelete }: { cycle: StudyCycle; onArchive: () => void; onDelete: () => void }) {
    const { t } = useTranslation();
    const format = useDateFormat();
    const { lap } = cycle;
    return (
        <section aria-labelledby="lap-title" className="flex flex-col gap-3.5 rounded-card border border-border bg-surface p-5" data-testid="cycle-lap">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.06em] text-text-2">
                        {t("StudyCycleLapStarted", { number: lap.number, date: format.long.format(new Date(lap.startedAt)) })}
                    </span>
                    <h2 id="lap-title" className="text-xl font-semibold tracking-[-0.01em] text-text">
                        {t("StudyCycleLapClosed", { closed: lap.blocksClosed, count: lap.blocks })}
                    </h2>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <Link to={`/notebook/cycles/${cycle.id}/edit`} data-testid="cycle-edit"
                        className="inline-flex h-9 items-center gap-1.5 rounded-control border border-border bg-surface px-3 text-[13px] font-semibold text-text hover:bg-surface-2">
                        <Pencil size={14} aria-hidden="true" />{t("StudyCycleEdit")}
                    </Link>
                    <button type="button" onClick={onArchive} data-testid="cycle-archive"
                        className="inline-flex h-9 items-center gap-1.5 rounded-control px-3 text-[13px] font-semibold text-text-2 hover:bg-surface-2 hover:text-danger">
                        <Archive size={14} aria-hidden="true" />{t("StudyCycleArchive")}
                    </button>
                    <button type="button" onClick={onDelete} data-testid="cycle-delete"
                        className="inline-flex h-9 items-center gap-1.5 rounded-control px-3 text-[13px] font-semibold text-text-2 hover:bg-surface-2 hover:text-danger">
                        <Trash2 size={14} aria-hidden="true" />{t("StudyCycleDelete")}
                    </button>
                </div>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(lapShare(lap) * 100)}%` }} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-text-2">
                {lap.understood > 0 && <span className="font-semibold text-success">{t("StudyCycleLapUnderstood", { count: lap.understood })}</span>}
                {lap.turnsUsed > 0 && <span>{t("StudyCycleLapTurnsUsed", { count: lap.turnsUsed })}</span>}
                <span>{t("StudyCycleLapStudied", { studied: formatStudyMinutes(lap.minutes), planned: formatStudyMinutes(lap.plannedMinutes) })}</span>
            </div>
        </section>
    );
}

/** The badge a block wears when today's slice reaches it. */
function todayBadge(block: StudyBlock, entry: TodayEntry | undefined, isNow: boolean): { key: string; values?: Record<string, unknown> } | null {
    if (isNow) return { key: "StudyCycleBadgeNext" };
    if (!entry) return null;
    const left = block.plannedMinutes - block.progress.minutes;
    return entry.minutesToday < left ? { key: "StudyCycleBadgeTodayPart", values: { minutes: entry.minutesToday } } : { key: "StudyCycleBadgeToday" };
}

function BlockRow({ cycle, block, today, first, last, moving, onOpen, onMove }: {
    cycle: StudyCycle;
    block: StudyBlock;
    today: { entries: TodayEntry[] } | null;
    first: boolean;
    last: boolean;
    moving: boolean;
    onOpen: () => void;
    onMove: (step: -1 | 1) => void;
}) {
    const { t } = useTranslation();
    const facts = factsOfBlock(block);
    const slice = today?.entries.filter((entry) => !entry.nextLap && !entry.doneToday) ?? [];
    const entry = slice.find((candidate) => candidate.blockId === block.id);
    const isNow = slice[0]?.blockId === block.id;
    const closed = block.progress.state !== "OPEN";
    const undecided = conceptUndecided(cycle.blocks, block);
    const figure = blockFigure(facts, { nextPosition: nextBlockOfTopic(cycle.blocks, block)?.position ?? null, current: isNow, undecided });
    const badge = todayBadge(block, entry, isNow);
    const detail = detailText(blockDetail({ ...block, target: block.progress.target, targetPreview: block.progress.targetPreview, undecided }), t);
    const title = blockTitle(facts, t);
    const root = blockTitleRoot(facts);

    return (
        <div data-testid="cycle-block" data-state={block.progress.state}
            className={`flex items-center gap-2 rounded-[12px] border pr-2 ${isNow ? "border-accent/40 bg-accent/5" : "border-border bg-surface"} ${closed ? "opacity-75" : ""}`}>
            <button type="button" onClick={onOpen} data-testid="cycle-block-open"
                aria-label={t("StudyCycleBlockOpenLabel", { position: block.position, title: subjectLabel({ title, rootTitle: root }), state: t(lapBlockStateLabelKey(block.progress.state)) })}
                className="flex min-w-0 flex-1 flex-wrap items-center gap-3.5 rounded-[12px] px-3.5 py-3 text-left hover:bg-surface-2/60">
                <BlockMarker position={block.position} state={block.progress.state} current={isNow} />
                <span className="flex min-w-[180px] flex-[1_1_240px] flex-col gap-[3px]">
                    <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-semibold text-text"><RootPrefix root={root} className="text-[13px]" />{title}</span>
                        <ModeChip mode={block.mode} />
                        {badge && (
                            <span className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold ${
                                isNow ? "bg-accent text-on-accent" : "bg-accent-soft text-accent"
                            }`}>
                                {t(badge.key, badge.values)}
                            </span>
                        )}
                    </span>
                    {detail && <span className="text-[13px] text-text-2">{detail}</span>}
                </span>
                <BlockFigureView figure={figure} className="w-full md:w-[190px]" />
            </button>
            <div className="flex flex-col">
                <button type="button" onClick={() => onMove(-1)} disabled={first || moving} data-testid="cycle-block-up"
                    aria-label={t("StudyCycleMoveUp", { position: block.position })}
                    className="rounded-md p-1 text-text-3 hover:bg-surface-2 hover:text-text disabled:opacity-30">
                    <ChevronUp size={16} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => onMove(1)} disabled={last || moving} data-testid="cycle-block-down"
                    aria-label={t("StudyCycleMoveDown", { position: block.position })}
                    className="rounded-md p-1 text-text-3 hover:bg-surface-2 hover:text-text disabled:opacity-30">
                    <ChevronDown size={16} aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}

/** The week: minutes per day and when each starts. The total is the sum, never typed twice. */
function WeekCard({ cycle, todayWeekday }: { cycle: StudyCycle; todayWeekday: Weekday | null }) {
    const { t, i18n } = useTranslation();
    const days = orderedDays(cycle.days);
    const names = weekdayNames(i18n.language);
    const most = Math.max(1, ...days.map((day) => day.minutes));
    return (
        <section aria-labelledby="week-title" className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4" data-testid="cycle-week">
            <div className="mb-1 flex items-baseline justify-between">
                <h2 id="week-title" className="text-sm font-semibold text-text">{t("StudyCycleWeek")}</h2>
                <span className="font-mono text-xs font-semibold text-text-2">{formatStudyMinutes(weekMinutes(cycle.days))}</span>
            </div>
            {days.map((day) => {
                const isToday = day.weekday === todayWeekday;
                return (
                    <div key={day.weekday} className={`flex items-center gap-2.5 rounded-control px-2 py-1 ${isToday ? "bg-accent/5" : ""}`}>
                        <span className={`w-9 text-[13px] font-semibold ${isToday ? "text-accent" : "text-text"}`}>{sentenceCase(names[day.weekday])}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                            <div className={`h-full rounded-full ${isToday ? "bg-accent" : "bg-text-3"}`} style={{ width: `${Math.round((day.minutes / most) * 100)}%` }} />
                        </div>
                        <span className="w-[86px] text-right text-xs text-text-2">
                            {day.minutes === 0
                                ? t("StudyCycleRestDay")
                                : [formatStudyMinutes(day.minutes), day.startTime].filter(Boolean).join(" · ")}
                        </span>
                    </div>
                );
            })}
        </section>
    );
}

function PreviousLaps({ laps }: { laps: LapSummary[] }) {
    const { t } = useTranslation();
    const format = useDateFormat();
    return (
        <section aria-labelledby="laps-title" className="flex flex-col gap-2.5 rounded-card border border-border bg-surface p-4" data-testid="cycle-previous-laps">
            <h2 id="laps-title" className="text-sm font-semibold text-text">{t("StudyCyclePreviousLaps")}</h2>
            {laps.map((lap) => {
                const started = new Date(lap.startedAt);
                const closed = lap.closedAt ? new Date(lap.closedAt) : started;
                const days = Math.max(1, Math.round((closed.getTime() - started.getTime()) / 86_400_000));
                return (
                    <div key={lap.number} className="flex flex-col gap-0.5 border-t border-border pt-2.5 first-of-type:border-t-0 first-of-type:pt-0">
                        <div className="flex items-baseline justify-between gap-3">
                            <span className="text-[13px] font-semibold text-text">{t("StudyCycleLapName", { number: lap.number })}</span>
                            <span className="font-mono text-[13px] font-semibold text-text">{formatStudyMinutes(lap.minutes)}</span>
                        </div>
                        <span className="text-xs text-text-2">
                            {t("StudyCycleLapDates", { range: format.range.formatRange(started, closed), count: days })}
                        </span>
                        <span className="text-xs text-text-2">{t("StudyCycleLapUnderstood", { count: lap.understood })}</span>
                    </div>
                );
            })}
        </section>
    );
}
