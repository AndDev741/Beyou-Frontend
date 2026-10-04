import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { RotateCcw, Sparkles, X } from "lucide-react";
import type { RootState } from "@beyou/state/rootReducer";
import { enterGoals } from "@beyou/state/goal/goalsSlice";
import getGoals from "@beyou/api/goals/getGoals";
import { createTopicFromDraft, draftRoadmap } from "@beyou/api/notebook";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import type { DraftNode, DraftNodeInput, StudyLevel } from "@beyou/types/notebook/notebook";
import Modal from "../modals/Modal";
import ErrorNotice from "../ErrorNotice";

type Row = DraftNode & { keep: boolean; link: boolean };

const HOURS = [3, 6, 10];
const LEVELS: { value: StudyLevel; key: string }[] = [
    { value: "NEW", key: "NotebookAiLevelNew" },
    { value: "SOME", key: "NotebookAiLevelSome" },
    { value: "SOLID", key: "NotebookAiLevelSolid" },
];

/**
 * "New topic with AI": describe what to learn, review the drafted roadmap, then create it.
 *
 * Nothing is stored until "Create". The draft can be revised in words ("split Discrete Math in
 * two"), nodes can be left out, and a node the person already has elsewhere is offered as a link
 * so one page and one progress serve both topics.
 */
export default function AiTopicDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const goals = useSelector((state: RootState) => state.goals.goals);
    const [title, setTitle] = useState("");
    const [why, setWhy] = useState("");
    const [level, setLevel] = useState<StudyLevel>("SOME");
    const [hours, setHours] = useState(6);
    const [goalId, setGoalId] = useState("");
    const [reference, setReference] = useState("");
    const [rows, setRows] = useState<Row[] | null>(null);
    const [change, setChange] = useState("");
    const [busy, setBusy] = useState<"draft" | "create" | null>(null);
    const [error, setError] = useState<ApiErrorPayload | null>(null);

    useEffect(() => {
        if (isOpen && goals.length === 0) {
            void getGoals(t).then((r) => Array.isArray(r.success) && dispatch(enterGoals(r.success)));
        }
    }, [isOpen, goals.length, t, dispatch]);

    const draft = async (revision?: string) => {
        if (!title.trim()) return;
        setBusy("draft");
        setError(null);
        const previous: DraftNodeInput[] | undefined = revision && rows
            ? rows.filter((r) => r.keep).map((r) => ({ title: r.title, subtopics: r.subtopics }))
            : undefined;
        const response = await draftRoadmap({
            title: title.trim(),
            why: why.trim() || undefined,
            level,
            hoursPerWeek: hours,
            goalId: goalId || null,
            references: reference.trim() ? [reference.trim()] : undefined,
            changeRequest: revision,
            previous,
        }, t);
        setBusy(null);
        if (!response.success) {
            setError(response.error ?? null);
            return;
        }
        setRows(response.success.nodes.map((n) => ({ ...n, keep: !n.optional, link: !!n.existingPageId })));
        setChange("");
    };

    const create = async () => {
        if (!rows) return;
        const kept = rows.filter((r) => r.keep);
        if (kept.length === 0) return;
        setBusy("create");
        setError(null);
        const response = await createTopicFromDraft({
            title: title.trim(),
            description: why.trim() || null,
            goalId: goalId || null,
            nodes: kept.map((r) => ({
                title: r.title,
                why: r.why,
                subtopics: r.link ? [] : r.subtopics,
                estimatedHours: r.estimatedHours,
                linkPageId: r.link ? r.existingPageId : null,
            })),
        }, t);
        setBusy(null);
        if (!response.success) {
            setError(response.error ?? null);
            return;
        }
        onClose();
        navigate(`/notebook/${response.success.id}`);
    };

    const kept = rows?.filter((r) => r.keep) ?? [];
    const weeklyHours = kept.filter((r) => !r.link).reduce((sum, r) => sum + r.estimatedHours, 0);
    const weeks = hours > 0 ? Math.ceil(weeklyHours / hours) : 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} labelledBy="ai-topic-title" className="!max-w-[1080px] !p-0">
            <div className="flex max-h-[85vh] w-[min(1080px,92vw)] flex-wrap overflow-y-auto rounded-[24px] bg-surface" data-testid="ai-topic-dialog">
                <form
                    className="flex min-w-0 flex-[1_1_320px] flex-col gap-4 border-border p-6 md:max-w-[400px] md:border-r"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void draft();
                    }}
                >
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-control bg-accent-soft text-accent">
                            <Sparkles size={18} aria-hidden="true" />
                        </span>
                        <h2 id="ai-topic-title" className="flex-1 text-xl font-semibold tracking-[-0.015em] text-text">{t("NotebookAiTitle")}</h2>
                        <button type="button" onClick={onClose} aria-label={t("Close")} className="rounded-control p-1.5 text-text-2 hover:bg-surface-2">
                            <X size={16} aria-hidden="true" />
                        </button>
                    </div>
                    <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-text">
                        {t("NotebookAiWhat")}
                        <input value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)} data-testid="ai-topic-what"
                            placeholder={t("NotebookTopicTitlePlaceholder")}
                            className="h-[42px] rounded-control border border-border bg-surface px-3 text-sm font-normal text-text outline-none focus:border-accent" />
                    </label>
                    <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-text">
                        {t("NotebookAiWhy")}
                        <textarea value={why} maxLength={600} rows={2} onChange={(e) => setWhy(e.target.value)}
                            className="resize-none rounded-control border border-border bg-surface p-3 text-sm font-normal text-text outline-none focus:border-accent" />
                    </label>
                    <fieldset className="flex flex-col gap-1.5">
                        <legend className="mb-1.5 text-[13px] font-semibold text-text">{t("NotebookAiLevel")}</legend>
                        <div className="flex gap-0.5 rounded-control bg-surface-2 p-[3px]">
                            {LEVELS.map((l) => (
                                <button key={l.value} type="button" aria-pressed={level === l.value} onClick={() => setLevel(l.value)}
                                    className={`h-8 flex-1 rounded-lg text-[13px] font-semibold ${level === l.value ? "bg-surface text-text shadow-sm" : "text-text-2"}`}>
                                    {t(l.key)}
                                </button>
                            ))}
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend className="mb-1.5 text-[13px] font-semibold text-text">{t("NotebookAiHours")}</legend>
                        <div className="flex gap-1.5">
                            {HOURS.map((h) => (
                                <button key={h} type="button" aria-pressed={hours === h} onClick={() => setHours(h)}
                                    className={`h-8 rounded-full border px-3.5 font-mono text-[13px] font-semibold ${hours === h ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface text-text-2"}`}>
                                    {t("NotebookAiHoursValue", { hours: h })}
                                </button>
                            ))}
                        </div>
                    </fieldset>
                    <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-text">
                        <span>{t("NotebookLinkGoal")} <span className="font-normal text-text-2">{t("NotebookOptional")}</span></span>
                        <select value={goalId} onChange={(e) => setGoalId(e.target.value)}
                            className="h-[42px] rounded-control border border-border bg-surface px-3 text-sm font-normal text-text outline-none focus:border-accent">
                            <option value="">{t("NotebookLinkNone")}</option>
                            {goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-text">
                        <span>{t("NotebookAiBasedOn")} <span className="font-normal text-text-2">{t("NotebookOptional")}</span></span>
                        <input value={reference} maxLength={500} onChange={(e) => setReference(e.target.value)}
                            placeholder={t("NotebookAiBasedOnPlaceholder")}
                            className="h-[42px] rounded-control border border-border bg-surface px-3 text-sm font-normal text-text outline-none focus:border-accent" />
                    </label>
                    <button type="submit" disabled={!title.trim() || busy !== null} data-testid="ai-topic-draft"
                        className="mt-auto inline-flex h-[42px] items-center justify-center gap-2 rounded-control border border-border bg-surface text-sm font-semibold text-text hover:bg-surface-2 disabled:opacity-60">
                        {rows ? <RotateCcw size={15} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
                        {busy === "draft" ? t("NotebookAiDrafting") : rows ? t("NotebookAiDraftAgain") : t("NotebookAiDraft")}
                    </button>
                </form>

                <section aria-label={t("NotebookAiDraftTitle")} className="flex min-w-0 flex-[999_1_460px] flex-col gap-3.5 bg-bg p-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-base font-semibold text-text">{t("NotebookAiDraftTitle")}</h3>
                        {rows && (
                            <span className="text-[13px] text-text-2">
                                {t("NotebookAiDraftSummary", { kept: kept.length, total: rows.length, weeks, hours })}
                            </span>
                        )}
                    </div>
                    <ErrorNotice error={error} />
                    {!rows && (
                        <p className="rounded-card border border-dashed border-border p-6 text-sm text-text-2">{t("NotebookAiDraftEmpty")}</p>
                    )}
                    {rows && (
                        <ol className="flex flex-col gap-2">
                            {rows.map((row, i) => (
                                <li key={`${row.title}-${i}`} data-testid="ai-draft-node"
                                    className={`flex items-start gap-3 rounded-[14px] border bg-surface px-3.5 py-3 ${row.keep ? "border-border" : "border-border opacity-60"}`}>
                                    <input type="checkbox" checked={row.keep} aria-label={t("NotebookAiKeepNode", { title: row.title })}
                                        onChange={() => setRows((r) => r!.map((x, j) => (j === i ? { ...x, keep: !x.keep } : x)))}
                                        className="mt-1 h-4 w-4 accent-[rgb(var(--accent-rgb))]" />
                                    <span className="mt-0.5 font-mono text-xs text-text-2">{String(i + 1).padStart(2, "0")}</span>
                                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                                        <span className={`text-sm font-semibold text-text ${row.keep ? "" : "line-through"}`}>{row.title}</span>
                                        {row.why && <span className="text-[13px] text-text-2">{row.why}</span>}
                                        {row.existingPageId && (
                                            <span className="flex flex-wrap items-center gap-2 rounded-control bg-accent-soft px-2.5 py-2 text-[13px]">
                                                <span className="flex-[1_1_220px]">
                                                    {t("NotebookAiExisting", {
                                                        topic: row.existingTopicTitle ?? "",
                                                        done: row.existingProgress?.done ?? 0,
                                                        total: row.existingProgress?.total ?? 0,
                                                    })}
                                                </span>
                                                <span role="radiogroup" aria-label={t("NotebookAiLinkOrCopy")} className="inline-flex gap-0.5 rounded-lg bg-surface p-0.5">
                                                    <button type="button" role="radio" aria-checked={row.link}
                                                        onClick={() => setRows((r) => r!.map((x, j) => (j === i ? { ...x, link: true } : x)))}
                                                        className={`h-[26px] rounded-md px-2.5 text-xs font-semibold ${row.link ? "bg-accent text-on-accent" : "text-text-2"}`}>
                                                        {t("NotebookAiLinkIt")}
                                                    </button>
                                                    <button type="button" role="radio" aria-checked={!row.link}
                                                        onClick={() => setRows((r) => r!.map((x, j) => (j === i ? { ...x, link: false } : x)))}
                                                        className={`h-[26px] rounded-md px-2.5 text-xs font-semibold ${!row.link ? "bg-accent text-on-accent" : "text-text-2"}`}>
                                                        {t("NotebookAiNewCopy")}
                                                    </button>
                                                </span>
                                            </span>
                                        )}
                                        {!row.link && row.subtopics.length > 0 && (
                                            <span className="flex flex-wrap gap-1.5">
                                                {row.subtopics.map((s) => (
                                                    <span key={s} className="inline-flex h-[26px] items-center rounded-lg bg-surface-2 px-2.5 text-xs text-text">{s}</span>
                                                ))}
                                            </span>
                                        )}
                                    </span>
                                    <span className="whitespace-nowrap font-mono text-xs text-text-2">
                                        {row.link ? t("NotebookAiLinked") : t("NotebookAiNodeMeta", { subtopics: row.subtopics.length, hours: row.estimatedHours })}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    )}
                    {rows && (
                        <form
                            className="flex items-center gap-2.5 rounded-xl border border-border bg-surface py-1.5 pl-3 pr-1.5"
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (change.trim()) void draft(change.trim());
                            }}
                        >
                            <Sparkles size={15} className="text-accent" aria-hidden="true" />
                            <input value={change} maxLength={500} onChange={(e) => setChange(e.target.value)}
                                placeholder={t("NotebookAiChangePlaceholder")} aria-label={t("NotebookAiChangePlaceholder")}
                                className="h-8 min-w-0 flex-1 bg-transparent text-sm text-text outline-none" />
                            <button type="submit" disabled={!change.trim() || busy !== null}
                                className="h-8 rounded-lg bg-surface-2 px-3 text-[13px] font-semibold text-text disabled:opacity-60">
                                {t("NotebookAiApply")}
                            </button>
                        </form>
                    )}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
                        <span className="max-w-[360px] text-[13px] text-text-2">{t("NotebookAiNothingUntil")}</span>
                        <div className="flex gap-2">
                            <button type="button" onClick={onClose} className="h-[42px] rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text">
                                {t("Cancel")}
                            </button>
                            <button type="button" onClick={create} disabled={!rows || kept.length === 0 || busy !== null} data-testid="ai-topic-create"
                                className="h-[42px] rounded-control bg-accent px-[18px] text-sm font-semibold text-on-accent disabled:opacity-60">
                                {busy === "create" ? t("NotebookAiCreating") : t("NotebookAiCreate", { count: kept.length })}
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </Modal>
    );
}
