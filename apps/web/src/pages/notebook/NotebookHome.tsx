import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Flame, Layers, NotebookPen, Plus, Sparkles, Timer, Trophy, Workflow } from "lucide-react";
import type { RootState } from "@beyou/state/rootReducer";
import { enterNotebookHome, progressShare } from "@beyou/state";
import { getNotebookHome } from "@beyou/api/notebook";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import type { TopicSummary } from "@beyou/types/notebook/notebook";
import PageHeader from "../../ui/PageHeader";
import EmptyState from "../../components/EmptyState";
import ErrorNotice from "../../components/ErrorNotice";
import MiniRoadmap from "../../components/notebook/MiniRoadmap";
import NewTopicModal from "../../components/notebook/NewTopicModal";
import AiTopicDialog from "../../components/notebook/AiTopicDialog";
import { useNotebookFocus } from "../../components/notebook/useNotebookFocus";

/**
 * The notebook's front page: what to continue, what to review, and every topic with its roadmap
 * in miniature.
 */
export default function NotebookHome() {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const home = useSelector((state: RootState) => state.notebook.home);
    const [error, setError] = useState<ApiErrorPayload | null>(null);
    const [creating, setCreating] = useState(false);
    const [aiOpen, setAiOpen] = useState(false);
    const { start } = useNotebookFocus();

    useEffect(() => {
        void getNotebookHome(t).then((response) => {
            if (response.success) dispatch(enterNotebookHome(response.success));
            else setError(response.error ?? null);
        });
    }, [t, dispatch]);

    const totals = (home?.topics ?? []).reduce(
        (acc, topic) => ({ done: acc.done + topic.progress.done, total: acc.total + topic.progress.total }),
        { done: 0, total: 0 }
    );
    const continuing = home?.continueStudying;

    return (
        <div className="min-h-[calc(100vh-5rem)] w-full bg-bg px-4 py-6 text-text lg:min-h-[calc(100vh-6rem)] lg:px-7" data-testid="notebook-home">
            <PageHeader
                title={t("Notebook")}
                subtitle={home ? t("NotebookHomeSubtitle", {
                    topics: home.topics.length, done: totals.done, total: totals.total, due: home.review.due,
                }) : undefined}
                action={
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setAiOpen(true)} data-testid="notebook-create-ai"
                            className="inline-flex h-10 items-center gap-2 rounded-control bg-accent-soft px-4 text-sm font-semibold text-accent">
                            <Sparkles size={16} aria-hidden="true" />{t("NotebookCreateWithAi")}
                        </button>
                        <button type="button" onClick={() => setCreating(true)} data-testid="notebook-new-topic"
                            className="inline-flex h-10 items-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-on-accent">
                            <Plus size={16} aria-hidden="true" />{t("NotebookNewTopic")}
                        </button>
                    </div>
                }
            />
            <ErrorNotice error={error} />

            {home && (continuing || home.review.due > 0) && (
                <section aria-label={t("NotebookPickUp")} className="grid grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] gap-4">
                    {continuing && (
                        <div className="flex flex-col gap-3.5 rounded-card border border-border bg-surface p-5" data-testid="notebook-continue">
                            <span className="text-xs font-semibold uppercase tracking-[0.06em] text-text-2">{t("NotebookContinue")}</span>
                            <div className="flex items-center gap-3">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                                    <Workflow size={22} aria-hidden="true" />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-lg font-semibold tracking-[-0.01em]">{continuing.title}</p>
                                    <p className="text-[13px] text-text-2">
                                        {continuing.studyingTitle
                                            ? t("NotebookContinueStudying", { topic: continuing.topicTitle ?? "", studying: continuing.studyingTitle, done: continuing.progress.done, total: continuing.progress.total })
                                            : t("NotebookContinueIn", { topic: continuing.topicTitle ?? "" })}
                                    </p>
                                </div>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                                <div className="h-full rounded-full bg-accent" style={{ width: `${progressShare(continuing.progress) * 100}%` }} />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Link to={`/notebook/${continuing.pageId}`} className="inline-flex h-10 items-center rounded-control bg-accent px-4 text-sm font-semibold text-on-accent">
                                    {t("NotebookOpenPage")}
                                </Link>
                                <button type="button" onClick={() => start({ id: continuing.pageId, title: continuing.title })}
                                    className="inline-flex h-10 items-center gap-2 rounded-control border border-border bg-surface px-3.5 text-sm font-semibold text-text">
                                    <Timer size={16} aria-hidden="true" />{t("NotebookFocus25")}
                                </button>
                            </div>
                        </div>
                    )}
                    {home.review.due > 0 && (
                        <div className="flex flex-col gap-3.5 rounded-card border border-border bg-surface p-5" data-testid="notebook-review-card">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-semibold uppercase tracking-[0.06em] text-text-2">{t("NotebookReview")}</span>
                                {home.review.streak > 0 && (
                                    <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-flame-soft px-2.5 text-xs font-semibold text-flame">
                                        <Flame size={13} aria-hidden="true" />{t("NotebookReviewStreak", { count: home.review.streak })}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-xp-soft text-xp">
                                    <Layers size={22} aria-hidden="true" />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-lg font-semibold tracking-[-0.01em]">{t("NotebookCardsDue", { count: home.review.due })}</p>
                                    <p className="text-[13px] text-text-2">{home.review.byTopic.map((d) => `${d.title} ${d.due}`).join(" · ")}</p>
                                </div>
                            </div>
                            <p className="text-[13px] text-text-2">{t("NotebookReviewExplain")}</p>
                            <div>
                                <Link to="/notebook/review" data-testid="notebook-review-now"
                                    className="inline-flex h-10 items-center rounded-control bg-text px-4 text-sm font-semibold text-surface">
                                    {t("NotebookReviewNow")}
                                </Link>
                            </div>
                        </div>
                    )}
                </section>
            )}

            {home && home.topics.length === 0 ? (
                <div className="mt-6">
                    <EmptyState
                        icon={<NotebookPen size={28} aria-hidden="true" />}
                        title={t("NotebookEmptyTitle")}
                        description={t("NotebookEmptyText")}
                        actionLabel={t("NotebookCreateWithAi")}
                        onAction={() => setAiOpen(true)}
                        secondaryLabel={t("NotebookNewTopic")}
                        onSecondary={() => setCreating(true)}
                    />
                </div>
            ) : (
                home && (
                    <>
                        <h2 className="mb-3 mt-8 text-base font-semibold">{t("NotebookTopics")}</h2>
                        <section aria-label={t("NotebookTopics")} className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-4">
                            {home.topics.map((topic) => <TopicCard key={topic.id} topic={topic} />)}
                            <button type="button" onClick={() => setCreating(true)}
                                className="flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-border p-4 text-center text-text-2 hover:bg-surface">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2"><Plus size={20} aria-hidden="true" /></span>
                                <span className="text-[15px] font-semibold text-text">{t("NotebookNewTopic")}</span>
                                <span className="max-w-[220px] text-[13px]">{t("NotebookNewTopicHint")}</span>
                            </button>
                        </section>
                    </>
                )
            )}

            <NewTopicModal isOpen={creating} onClose={() => setCreating(false)} />
            {aiOpen && <AiTopicDialog isOpen={aiOpen} onClose={() => setAiOpen(false)} />}
        </div>
    );
}

function TopicCard({ topic }: { topic: TopicSummary }) {
    const { t } = useTranslation();
    return (
        <Link to={`/notebook/${topic.id}`} data-testid="topic-card"
            className="flex flex-col gap-3.5 rounded-card border border-border bg-surface p-4 transition-colors hover:border-text-3/60">
            <MiniRoadmap nodes={topic.preview} edges={topic.previewEdges} />
            <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
                    <Layers size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                    <p className="text-base font-semibold text-text">{topic.title}</p>
                    {topic.description && <p className="line-clamp-2 text-[13px] leading-[18px] text-text-2">{topic.description}</p>}
                </div>
            </div>
            <div className="flex items-center gap-2.5">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full bg-accent" style={{ width: `${progressShare(topic.progress) * 100}%` }} />
                </div>
                <span className="font-mono text-xs font-semibold text-text-2">{topic.progress.done}/{topic.progress.total}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
                {topic.goal && (
                    <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-accent-soft px-2.5 text-xs font-semibold text-accent">
                        <Trophy size={12} aria-hidden="true" />{topic.goal.name}
                    </span>
                )}
                {topic.cardsDue > 0 && (
                    <span className="inline-flex h-6 items-center rounded-full bg-surface-2 px-2.5 text-xs font-semibold text-text-2">
                        {t("NotebookDueCount", { count: topic.cardsDue })}
                    </span>
                )}
                {topic.sourcesCount > 0 && (
                    <span className="inline-flex h-6 items-center rounded-full bg-surface-2 px-2.5 text-xs font-semibold text-text-2">
                        {t("NotebookSourcesCount", { count: topic.sourcesCount })}
                    </span>
                )}
                {topic.next && (
                    <span className="inline-flex h-6 items-center rounded-full bg-surface-2 px-2.5 text-xs font-semibold text-text-2">
                        {t("NotebookNextUp", { title: topic.next.title })}
                    </span>
                )}
            </div>
        </Link>
    );
}
