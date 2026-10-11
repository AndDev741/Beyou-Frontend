import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Repeat, Timer } from "lucide-react";
import { blockPage, blockTitle, currentEntry, factsOfEntry, formatStudyMinutes } from "@beyou/state";
import { canStartNotebookFocus } from "@beyou/state/focus/notebookFocus";
import type { TodayEntry } from "@beyou/types/notebook/studyCycle";
import BaseDiv from "./baseDiv";
import { useStudyToday } from "../notebook/cycles/useStudyToday";
import { useNotebookFocus } from "../notebook/useNotebookFocus";

/** Ring geometry: a 64px ring with a 7px stroke. */
const RADIUS = 27;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** The rows under the block on now. More belongs on the notebook's card. */
const NEXT_ROWS = 2;

/**
 * Today's study on the dashboard: blocks closed out of the day's, the block on now with a way to
 * start its pomodoro, and the next couple after it.
 *
 * Self-fetching like `moodWeek`; it reads the same slice as the notebook's "Today" card, so a
 * block closed on one is closed on the other.
 */
export default function StudyToday() {
    const { t } = useTranslation();
    const { today } = useStudyToday();
    const { start, timer } = useNotebookFocus();
    const focusBusy = !canStartNotebookFocus(timer, Date.now());

    const action = (
        <Link to="/notebook" className="text-[11.5px] font-medium hover:text-text-2">
            {t("StudyTodayWidgetOpen")}
        </Link>
    );

    if (!today) {
        return (
            <BaseDiv title={t("StudyTodayWidget")} icon={<Repeat size={14.5} aria-hidden="true" />} action={action}>
                <div className="mt-3 h-16 animate-pulse rounded-control bg-surface-2" data-testid="study-today-widget-loading" />
            </BaseDiv>
        );
    }

    const noCycles = today.cycles.length === 0 && today.restingCycles.length === 0;
    const entries = today.cycles.flatMap((cycle) => cycle.entries.filter((entry) => !entry.doneToday));
    const onCycle = today.cycles.find((cycle) => currentEntry(cycle) !== null);
    const now = onCycle ? currentEntry(onCycle) : null;
    const after = entries.filter((entry) => entry !== now).slice(0, NEXT_ROWS);
    const share = today.blocksTotal > 0 ? today.blocksDone / today.blocksTotal : 0;

    return (
        <BaseDiv title={t("StudyTodayWidget")} icon={<Repeat size={14.5} aria-hidden="true" />} action={action}>
            <div className="mt-3 flex flex-col gap-3" data-testid="study-today-widget">
                {noCycles ? (
                    <div className="flex flex-col gap-2">
                        <p className="text-[13px] text-text-2">{t("StudyCycleInviteText")}</p>
                        <Link to="/notebook/cycles/new" className="w-fit text-[13px] font-semibold text-accent hover:underline">
                            {t("StudyCycleInviteAction")}
                        </Link>
                    </div>
                ) : today.cycles.length === 0 ? (
                    <p className="text-[13px] text-text-2" data-testid="study-today-widget-resting">{t("StudyTodayWidgetResting")}</p>
                ) : (
                    <>
                        <div className="flex items-center gap-3.5">
                            <svg width="64" height="64" viewBox="0 0 64 64" role="img" className="shrink-0"
                                aria-label={t("StudyTodayWidgetRing", { done: today.blocksDone, count: today.blocksTotal })}>
                                <circle cx="32" cy="32" r={RADIUS} fill="none" strokeWidth="7" className="stroke-surface-2" />
                                <circle cx="32" cy="32" r={RADIUS} fill="none" strokeWidth="7" strokeLinecap="round" className="stroke-accent"
                                    strokeDasharray={`${share * CIRCUMFERENCE} ${CIRCUMFERENCE}`} transform="rotate(-90 32 32)" />
                            </svg>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-lg font-semibold tracking-[-0.01em] text-text">
                                    {t("StudyTodayWidgetBlocks", { done: today.blocksDone, count: today.blocksTotal })}
                                </span>
                                <span className="text-xs text-text-2">
                                    {t("StudyTodayWidgetStudied", { minutes: formatStudyMinutes(today.studiedMinutes) })}
                                </span>
                            </div>
                        </div>

                        {now ? (
                            <div className="flex flex-col gap-2.5 rounded-control border border-accent/30 bg-accent/5 p-3">
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-sm font-semibold text-text">
                                        {[now.start, blockTitle(factsOfEntry(now), t)].filter(Boolean).join(" · ")}
                                    </span>
                                    <span className="shrink-0 font-mono text-[11px] font-semibold text-accent">{nowFigure(now)}</span>
                                </div>
                                <button type="button" onClick={() => start(blockPage(now))} disabled={focusBusy} data-testid="study-today-widget-focus"
                                    title={focusBusy ? t("NotebookFocusBusyHint") : undefined}
                                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-control bg-accent text-[13px] font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-60">
                                    <Timer size={15} aria-hidden="true" />{t("StudyTodayWidgetFocus")}
                                </button>
                            </div>
                        ) : (
                            <p className="text-[13px] text-text-2">{t("StudyTodayAllDone")}</p>
                        )}

                        {after.length > 0 && (
                            <ul className="flex flex-col">
                                {after.map((entry) => (
                                    <li key={`${entry.blockId}-${entry.nextLap}`} className="flex items-center justify-between gap-2 border-b border-border py-1.5 text-[13px] last:border-b-0">
                                        <span className="min-w-0 truncate text-text">
                                            {entry.start && <span className="mr-1.5 font-mono text-[11px] text-text-2">{entry.start}</span>}
                                            {blockTitle(factsOfEntry(entry), t)}
                                        </span>
                                        <span className="shrink-0 font-mono text-[11px] font-semibold text-text-2">{formatStudyMinutes(entry.minutesToday)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </>
                )}
            </div>
        </BaseDiv>
    );
}

/** The short figure beside the block on now: subpages for a concept, minutes otherwise. */
function nowFigure(entry: TodayEntry): string {
    const progress = entry.target?.progress;
    if (entry.mode === "GOAL" && progress && progress.total > 1) return `${progress.done}/${progress.total}`;
    return formatStudyMinutes(entry.minutesToday);
}
