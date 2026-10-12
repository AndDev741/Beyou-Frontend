import { useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { ChevronRight, Coffee, Plus, Repeat, Timer } from "lucide-react";
import type { RootState } from "@beyou/state/rootReducer";
import {
    blockDetail, blockFigure, blockPage, blockTitle, blockTitleRoot, conceptComesBackAt, currentEntry, detailText, entryConceptUndecided,
    factsOfEntry, formatStudyMinutes, isConceptBlock,
} from "@beyou/state";
import { canStartNotebookFocus } from "@beyou/state/focus/notebookFocus";
import type { TopicSummary } from "@beyou/types/notebook/notebook";
import type { StudyTodayCycle, TodayEntry } from "@beyou/types/notebook/studyCycle";
import { useNotebookFocus } from "../useNotebookFocus";
import { BlockFigureView, BlockIcon, ModeChip, RootPrefix } from "./BlockParts";
import LogSessionDialog from "./LogSessionDialog";
import { useStudyToday } from "./useStudyToday";

type Props = {
    /** The notebook's topics, to start a pomodoro on the habit a topic is linked to. */
    topics: TopicSummary[];
    /** Offer to build a first cycle. Off while the notebook has no topic to put in one. */
    showInvite: boolean;
};

/**
 * "Today" at the top of the notebook: per cycle with minutes today, the slice of its queue that
 * fits the day, with clock times when the day has a start time.
 *
 * Three quieter states: nothing at all until the slice arrives (or when the server cannot give
 * one, so an older backend leaves the home as it was), an invitation when there is no cycle, and
 * a single line on a rest day.
 */
export default function StudyTodayCard({ topics, showInvite }: Props) {
    const { t, i18n } = useTranslation();
    const { today } = useStudyToday();
    const byId = useSelector((state: RootState) => state.studyCycles.byId);
    const { start, timer } = useNotebookFocus();
    const [logging, setLogging] = useState(false);
    // One pomodoro in the app, the rule the page screen follows too.
    const focusBusy = !canStartNotebookFocus(timer, Date.now());

    if (!today) return null;

    if (today.cycles.length === 0 && today.restingCycles.length === 0) {
        if (!showInvite) return null;
        return (
            <section className="mb-4 flex flex-wrap items-center gap-4 rounded-card border border-dashed border-border bg-surface p-5" data-testid="study-cycle-invite">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent" aria-hidden="true">
                    <Repeat size={20} />
                </span>
                <div className="min-w-[220px] flex-1">
                    <p className="text-[15px] font-semibold text-text">{t("StudyCycleInviteTitle")}</p>
                    <p className="text-[13px] text-text-2">{t("StudyCycleInviteText")}</p>
                </div>
                <Link to="/notebook/cycles/new" data-testid="study-cycle-invite-action"
                    className="inline-flex h-10 items-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-on-accent">
                    <Plus size={16} aria-hidden="true" />{t("StudyCycleInviteAction")}
                </Link>
            </section>
        );
    }

    const names = (list: string[]) => new Intl.ListFormat(i18n.language, { type: "conjunction" }).format(list);

    if (today.cycles.length === 0) {
        return (
            <section className="mb-4 flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface px-5 py-4" data-testid="study-today-resting">
                <Coffee size={18} className="shrink-0 text-text-3" aria-hidden="true" />
                <p className="min-w-0 flex-1 text-sm text-text-2">
                    {t("StudyTodayResting", { names: names(today.restingCycles.map((cycle) => cycle.name)) })}
                </p>
                <Link to="/notebook/cycles" className="text-sm font-semibold text-accent">{t("StudyCyclesLink")}</Link>
            </section>
        );
    }

    const dateLabel = new Intl.DateTimeFormat(i18n.language, { weekday: "long", day: "numeric", month: "long" })
        .format(new Date(`${today.date}T12:00:00`));
    const share = today.blocksTotal > 0 ? today.blocksDone / today.blocksTotal : 0;
    // The block the day is on: the first open one, across cycles in the order the server sent.
    const onCycle = today.cycles.find((cycle) => currentEntry(cycle) !== null) ?? null;
    const current = onCycle ? currentEntry(onCycle) : null;
    const habitOf = (topicId: string) => topics.find((topic) => topic.id === topicId)?.habit?.id ?? null;

    return (
        <section aria-labelledby="study-today-title" data-testid="study-today-card"
            className="mb-4 flex flex-col gap-[18px] rounded-card border border-border bg-surface p-5 shadow-surface lg:p-[22px]">
            <div className="flex flex-wrap items-start justify-between gap-3.5">
                <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-[0.06em] text-text-2">
                        {t("StudyTodayEyebrow", { date: dateLabel })}
                    </span>
                    <h2 id="study-today-title" className="text-[22px] font-semibold tracking-[-0.01em] text-text" data-testid="study-today-headline">
                        {t("StudyTodayHeadline", { done: today.blocksDone, count: today.blocksTotal, studied: formatStudyMinutes(today.studiedMinutes) })}
                    </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setLogging(true)} data-testid="study-today-log"
                        className="inline-flex h-10 items-center gap-2 rounded-control border border-border bg-surface px-3.5 text-sm font-semibold text-text hover:bg-surface-2">
                        <Plus size={16} aria-hidden="true" />{t("StudySessionTitle")}
                    </button>
                    <Link to="/notebook/cycles" className="inline-flex h-10 items-center gap-1.5 rounded-control px-2.5 text-sm font-semibold text-accent">
                        {t("StudyCyclesSeeAll")}<ChevronRight size={16} aria-hidden="true" />
                    </Link>
                </div>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(share * 100)}%` }} />
            </div>

            {today.cycles.map((cycle) => (
                <CycleSlice key={cycle.cycleId} cycle={cycle} current={current} focusBusy={focusBusy}
                    onFocus={(entry) => start(blockPage(entry), habitOf(entry.topic.id))} />
            ))}

            <p className="border-t border-border pt-3.5 text-[13px] text-text-2" data-testid="study-today-footer">
                {current && onCycle ? footerLine(current, onCycle, byId[onCycle.cycleId] ?? null, t) : t("StudyTodayAllDone")}
            </p>

            <LogSessionDialog isOpen={logging} onClose={() => setLogging(false)} defaultTopicId={current?.topic.id ?? null} />
        </section>
    );
}

/**
 * What happens if the block the day is on does not close: for a concept, the cycle moves on and
 * the concept comes back in the topic's next block. A time block just runs its minutes, so it
 * gets a plainer line.
 */
function footerLine(entry: TodayEntry, cycle: StudyTodayCycle, full: Parameters<typeof conceptComesBackAt>[2], t: (key: string, values?: Record<string, unknown>) => string): string {
    if (!isConceptBlock(factsOfEntry(entry))) {
        return t("StudyTodayFooterTime", { title: entry.topic.title, minutes: entry.minutesToday });
    }
    const title = entry.target!.title;
    const position = conceptComesBackAt(entry, cycle.entries, full);
    if (entry.end) {
        return position
            ? t("StudyTodayFooterBackAt", { title, end: entry.end, position })
            : t("StudyTodayFooterBackLater", { title, end: entry.end });
    }
    return position
        ? t("StudyTodayFooterBackAtNoTime", { title, position })
        : t("StudyTodayFooterBackLaterNoTime", { title });
}

function CycleSlice({ cycle, current, focusBusy, onFocus }: {
    cycle: StudyTodayCycle;
    current: TodayEntry | null;
    focusBusy: boolean;
    onFocus: (entry: TodayEntry) => void;
}) {
    const { t } = useTranslation();
    const on = currentEntry(cycle);
    const meta = [
        cycle.startTime,
        formatStudyMinutes(cycle.dayMinutes),
        on
            ? t("StudyTodayCycleMeta", { lap: cycle.lapNumber, position: on.position, total: cycle.blocksInLap })
            : t("StudyTodayCycleMetaDone", { lap: cycle.lapNumber }),
    ].filter(Boolean).join(" · ");

    return (
        <div className="flex flex-col gap-2.5" data-testid="study-today-cycle">
            <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex h-6 items-center rounded-full bg-surface-2 px-2.5 text-xs font-semibold text-text">{cycle.name}</span>
                <span className="text-[13px] text-text-2">{meta}</span>
            </div>
            <ul className="flex flex-col gap-2.5">
                {cycle.entries.map((entry) => (
                    <EntryRow key={`${entry.blockId}-${entry.nextLap}`} entry={entry} undecided={entryConceptUndecided(cycle.entries, entry)}
                        current={current?.blockId === entry.blockId && current.nextLap === entry.nextLap}
                        focusBusy={focusBusy} onFocus={() => onFocus(entry)} />
                ))}
            </ul>
        </div>
    );
}

function EntryRow({ entry, undecided, current, focusBusy, onFocus }: {
    entry: TodayEntry;
    /** A roadmap block whose concept is picked when it comes up. */
    undecided: boolean;
    current: boolean;
    focusBusy: boolean;
    onFocus: () => void;
}) {
    const { t } = useTranslation();
    const facts = factsOfEntry(entry);
    const concept = isConceptBlock(facts);
    const figure = blockFigure(facts, { minutesToday: entry.doneToday ? undefined : entry.minutesToday, current, undecided });
    const detail = detailText(blockDetail({ ...entry, undecided }), t);
    const page = blockPage(entry);

    return (
        <li data-testid="study-today-entry" data-current={current ? "true" : "false"}
            className={`flex flex-wrap items-center gap-3.5 rounded-[12px] border px-3.5 py-3 ${
                current ? "border-accent/40 bg-accent/5" : "border-border"
            }`}>
            {entry.start && (
                <span className={`w-[92px] font-mono text-[13px] ${current ? "font-semibold text-accent" : "font-medium text-text-2"}`}>
                    {entry.end ? `${entry.start}–${entry.end}` : entry.start}
                </span>
            )}
            <BlockIcon done={entry.doneToday} concept={concept || undecided} current={current} />
            <div className="flex min-w-[200px] flex-[1_1_260px] flex-col gap-[3px]">
                <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-semibold text-text">
                        <RootPrefix root={blockTitleRoot(facts)} className="text-[13px]" />{blockTitle(facts, t)}
                    </span>
                    {!concept && !undecided && <ModeChip mode={entry.mode} />}
                    {current && (
                        <span className="inline-flex h-5 items-center rounded-full bg-accent px-2 text-[11px] font-semibold text-on-accent">
                            {t("StudyTodayNext")}
                        </span>
                    )}
                    {entry.nextLap && (
                        <span className="inline-flex h-5 items-center rounded-full bg-surface-2 px-2 text-[11px] font-semibold text-text-2">
                            {t("StudyTodayNextLap")}
                        </span>
                    )}
                </span>
                {detail && <span className="text-[13px] text-text-2">{detail}</span>}
            </div>
            <BlockFigureView figure={figure} className="w-full md:w-[170px]" />
            {/* A block done today has nothing to start or open; on a wide row the empty column
                still keeps the figures lined up. */}
            <div className={`gap-2 md:flex md:w-[176px] ${entry.doneToday ? "hidden" : "flex"}`}>
                {current && (
                    <button type="button" onClick={onFocus} disabled={focusBusy} data-testid="study-today-focus"
                        title={focusBusy ? t("NotebookFocusBusyHint") : undefined}
                        className="inline-flex h-[38px] items-center gap-1.5 rounded-control bg-accent px-3 text-[13px] font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-60">
                        <Timer size={15} aria-hidden="true" />{t("StudyTodayFocus")}
                    </button>
                )}
                {!entry.doneToday && (
                    <Link to={`/notebook/${page.id}`} aria-label={t("StudyTodayOpenLabel", { title: page.title })}
                        className="inline-flex h-[38px] items-center rounded-control border border-border bg-surface px-3 text-[13px] font-semibold text-text hover:bg-surface-2">
                        {t("StudyTodayOpen")}
                    </Link>
                )}
            </div>
        </li>
    );
}
