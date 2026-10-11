import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { getNotebookHome, getStudyCycle, getStudyCycles, logStudySession } from "@beyou/api/notebook";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import {
    addDaysIso, enterNotebookHome, enterStudyCycle, enterStudyCycles, formatStudyMinutes, previewCredit,
} from "@beyou/state";
import type { RootState } from "@beyou/state/rootReducer";
import type { StudyCycle } from "@beyou/types/notebook/studyCycle";
import Modal from "../../modals/Modal";
import ErrorNotice from "../../ErrorNotice";
import useTodayInZone from "../../../hooks/useTodayInZone";
import { notify } from "../../../lib/notify";
import { useTopicPages } from "./useTopicPages";
import { useRefreshStudyCycles } from "./useStudyToday";

/** The minutes people log most, one tap each. */
const MINUTE_CHIPS = [25, 45, 60, 90];
/** How far back a session may be dated; the server refuses older days (STUDY_SESSION_DATE). */
const DAYS_BACK = 30;

type Props = {
    isOpen: boolean;
    onClose: () => void;
    /** The topic to start on, e.g. the block the day is on. */
    defaultTopicId?: string | null;
};

/**
 * "Log a session": study done away from the timer (a book, a class, exercises on paper) goes into
 * the cycle like a pomodoro would.
 *
 * Before sending, it says which block the minutes land on, worked out from the loaded cycle the
 * way the server credits (`previewCredit`). The toast afterwards reads the server's answer, so if
 * the two ever disagree the person is told what really happened.
 */
export default function LogSessionDialog({ isOpen, onClose, defaultTopicId }: Props) {
    if (!isOpen) return null;
    return <LogSessionForm onClose={onClose} defaultTopicId={defaultTopicId ?? null} />;
}

function LogSessionForm({ onClose, defaultTopicId }: { onClose: () => void; defaultTopicId: string | null }) {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const refresh = useRefreshStudyCycles();
    const today = useTodayInZone();
    const list = useSelector((state: RootState) => state.studyCycles.list);
    const byId = useSelector((state: RootState) => state.studyCycles.byId);
    const home = useSelector((state: RootState) => state.notebook.home);

    const [topicId, setTopicId] = useState<string>(defaultTopicId ?? "");
    const [pageId, setPageId] = useState("");
    const [studiedOn, setStudiedOn] = useState(today);
    const [minutes, setMinutes] = useState(45);
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<ApiErrorPayload | null>(null);
    const { pages } = useTopicPages(topicId || null);

    // Every active cycle in full, for the grouped topic list and the preview. The list is read
    // once on open; cycles already loaded elsewhere are not read again.
    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const listed = await getStudyCycles(t);
            if (cancelled || !listed.success) return;
            dispatch(enterStudyCycles(listed.success));
            const missing = listed.success.filter((summary) => !byId[summary.id]);
            const loaded = await Promise.all(missing.map((summary) => getStudyCycle(summary.id, t)));
            if (cancelled) return;
            loaded.forEach((cycle) => cycle.success && dispatch(enterStudyCycle(cycle.success)));
        })();
        if (!home) {
            void getNotebookHome(t).then((response) => {
                if (!cancelled && response.success) dispatch(enterNotebookHome(response.success));
            });
        }
        return () => {
            cancelled = true;
        };
        // Once per opening: the reads above refresh the store, and re-running on their result
        // would read everything again.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cycles = useMemo(
        () => list.map((summary) => byId[summary.id]).filter((cycle): cycle is StudyCycle => Boolean(cycle)),
        [list, byId]
    );
    const inCycles = useMemo(() => new Set(cycles.flatMap((cycle) => cycle.topics.map((topic) => topic.topicId))), [cycles]);
    const otherTopics = (home?.topics ?? []).filter((topic) => !inCycles.has(topic.id));

    // Starts on the given topic, else the first cycle's first topic once the cycles arrive.
    useEffect(() => {
        if (topicId) return;
        const first = cycles[0]?.topics[0]?.topicId ?? otherTopics[0]?.id;
        if (first) setTopicId(first);
    }, [topicId, cycles, otherTopics]);

    const cycle = cycles.find((candidate) => candidate.topics.some((topic) => topic.topicId === topicId)) ?? null;
    const steps = cycle && minutes > 0 ? previewCredit(cycle, topicId, minutes) : [];
    const minDate = addDaysIso(today, -DAYS_BACK);
    const validMinutes = Number.isInteger(minutes) && minutes >= 1 && minutes <= 600;
    const validDate = studiedOn >= minDate && studiedOn <= today;
    const canSubmit = Boolean(topicId) && validMinutes && validDate && !busy;

    const pickTopic = (id: string) => {
        setTopicId(id);
        setPageId("");
    };

    const submit = async () => {
        if (!canSubmit) return;
        setBusy(true);
        setError(null);
        const response = await logStudySession(
            { topicId, pageId: pageId || null, minutes, studiedOn, note: note.trim() || null },
            t
        );
        setBusy(false);
        if (!response.success) {
            setError(response.error ?? {});
            return;
        }
        const credited = response.success.credited;
        notify.success(t("StudySessionLogged", { minutes: formatStudyMinutes(minutes) }), {
            subtitle: credited
                ? t("StudySessionLoggedInto", {
                      position: credited.position,
                      cycle: credited.cycleName,
                      after: credited.minutesAfter,
                      planned: credited.plannedMinutes,
                  })
                : t("StudySessionLoggedNoCycle"),
        });
        void refresh();
        onClose();
    };

    const first = steps[0];
    return (
        <Modal isOpen onClose={onClose} labelledBy="log-session-title" className="max-w-lg">
            <form
                className="flex w-full flex-col gap-4"
                data-testid="log-session-dialog"
                onSubmit={(e) => {
                    e.preventDefault();
                    void submit();
                }}
            >
                <div>
                    <h2 id="log-session-title" className="text-lg font-semibold text-text">{t("StudySessionTitle")}</h2>
                    <p className="mt-1 text-[13px] text-text-2">{t("StudySessionIntro")}</p>
                </div>

                <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-text">
                    {t("StudySessionTopic")}
                    <select value={topicId} onChange={(e) => pickTopic(e.target.value)} data-testid="log-session-topic"
                        className="h-11 rounded-control border border-border bg-surface px-3 text-sm font-normal text-text outline-none focus:border-accent">
                        {!topicId && <option value="">{t("StudySessionPickTopic")}</option>}
                        {cycles.map((group) => (
                            <optgroup key={group.id} label={group.name}>
                                {group.topics.map((topic) => (
                                    <option key={topic.topicId} value={topic.topicId}>{topic.topic.title}</option>
                                ))}
                            </optgroup>
                        ))}
                        {otherTopics.length > 0 && (
                            <optgroup label={t("StudySessionOtherTopics")}>
                                {otherTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}
                            </optgroup>
                        )}
                    </select>
                </label>

                <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-text">
                    {t("StudySessionPage")}
                    <select value={pageId} onChange={(e) => setPageId(e.target.value)} disabled={!topicId} data-testid="log-session-page"
                        className="h-11 rounded-control border border-border bg-surface px-3 text-sm font-normal text-text outline-none focus:border-accent disabled:opacity-60">
                        <option value="">{t("StudySessionNoPage")}</option>
                        {pages.filter((page) => page.depth > 0).map((page) => (
                            <option key={page.id} value={page.id}>{`${"  ".repeat(page.depth - 1)}${page.title}`}</option>
                        ))}
                    </select>
                </label>

                <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-text">
                        {t("StudySessionDay")}
                        <input type="date" value={studiedOn} min={minDate} max={today} onChange={(e) => setStudiedOn(e.target.value)}
                            data-testid="log-session-date"
                            className="h-11 rounded-control border border-border bg-surface px-3 text-sm font-normal text-text outline-none focus:border-accent" />
                    </label>
                    <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-text">
                        {t("StudySessionMinutes")}
                        <input type="number" inputMode="numeric" min={1} max={600} value={Number.isNaN(minutes) ? "" : minutes}
                            onChange={(e) => setMinutes(e.target.value === "" ? NaN : Math.round(Number(e.target.value)))}
                            data-testid="log-session-minutes"
                            className="h-11 rounded-control border border-border bg-surface px-3 text-sm font-normal text-text outline-none focus:border-accent" />
                    </label>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label={t("StudySessionQuickMinutes")}>
                    {MINUTE_CHIPS.map((chip) => (
                        <button key={chip} type="button" onClick={() => setMinutes(chip)} aria-pressed={minutes === chip}
                            className={`h-8 rounded-full border px-3 text-[13px] font-semibold ${
                                minutes === chip ? "border-text bg-text text-surface" : "border-border bg-surface text-text hover:bg-surface-2"
                            }`}>
                            {formatStudyMinutes(chip)}
                        </button>
                    ))}
                </div>

                <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-text">
                    {t("StudySessionNote")}
                    <input type="text" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} data-testid="log-session-note"
                        placeholder={t("StudySessionNotePlaceholder")}
                        className="h-11 rounded-control border border-border bg-surface px-3 text-sm font-normal text-text outline-none focus:border-accent" />
                </label>

                <div className="flex flex-col gap-2 rounded-control bg-surface-2 p-3" data-testid="log-session-preview" aria-live="polite">
                    {first ? (
                        <>
                            <span className="text-xs font-semibold text-text-2">
                                {t("StudySessionPreviewBlock", { position: first.block.position, cycle: cycle?.name ?? "" })}
                            </span>
                            <div className="flex items-baseline justify-between gap-3 text-sm">
                                <span className="font-semibold text-text">{first.block.topic.title}</span>
                                <span className="font-mono text-[13px] text-text-2">
                                    {t("StudySessionPreviewMinutes", { before: first.before, after: first.after, planned: first.block.plannedMinutes })}
                                </span>
                            </div>
                            <div className="h-[5px] overflow-hidden rounded-full bg-border" aria-hidden="true">
                                <div className="h-full rounded-full bg-accent"
                                    style={{ width: `${Math.min(100, Math.round((first.after / Math.max(1, first.block.plannedMinutes)) * 100))}%` }} />
                            </div>
                            {steps.slice(1).map((step) => (
                                <span key={step.block.id} className="text-xs text-text-2">
                                    {t("StudySessionPreviewSpill", { minutes: step.after - step.before, position: step.block.position })}
                                </span>
                            ))}
                        </>
                    ) : (
                        <span className="text-[13px] text-text-2">
                            {cycle ? t("StudySessionPreviewNoBlock") : t("StudySessionPreviewNoCycle")}
                        </span>
                    )}
                    {cycle && studiedOn !== today && (
                        <span className="text-xs text-text-3">{t("StudySessionPreviewPastDay")}</span>
                    )}
                </div>

                <ErrorNotice error={error} />

                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-control px-4 py-2 text-sm font-semibold text-text-2 hover:bg-surface-2">
                        {t("Cancel")}
                    </button>
                    <button type="submit" disabled={!canSubmit} data-testid="log-session-submit"
                        className="rounded-control bg-accent px-4 py-2 text-sm font-semibold text-on-accent disabled:opacity-60">
                        {validMinutes ? t("StudySessionSubmit", { minutes: formatStudyMinutes(minutes) }) : t("StudySessionSubmitPlain")}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
