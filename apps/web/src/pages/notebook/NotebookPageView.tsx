import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { ChevronRight, Ellipsis, FileText, Layers, Sparkles, Timer, Trash2, Workflow } from "lucide-react";
import type { RootState } from "@beyou/state/rootReducer";
import { enterNotebookPage, notebookPageDetailsChanged, progressShare, removeNotebookPage } from "@beyou/state";
import { deletePage, getPage, savePageContent, updatePage } from "@beyou/api/notebook";
import { getFriendlyErrorMessage, type ApiErrorPayload } from "@beyou/api/apiError";
import { BOARD_BLOCK_TYPE } from "@beyou/types/notebook/notebook";
import PageTree from "../../components/notebook/PageTree";
import NotebookEditor from "../../components/notebook/editor/NotebookEditor";
import TopicLinks from "../../components/notebook/TopicLinks";
import ExplainPanel from "../../components/notebook/ExplainPanel";
import StatusPicker from "../../components/notebook/StatusPicker";
import { useStatusChange } from "../../components/notebook/useStatusChange";
import { useNotebookFocus } from "../../components/notebook/useNotebookFocus";
import { formatMinutes } from "../../components/notebook/board/NodeInspector";
import Ring from "../../ui/Ring";
import ErrorNotice from "../../components/ErrorNotice";
import Modal from "../../components/modals/Modal";
import NotebookIcon from "../../components/notebook/NotebookIcon";
import PageIconPicker from "../../components/notebook/PageIconPicker";
import { useNoDesktopSpacer } from "../../components/shell/desktopSpacer";

type SaveState = "idle" | "saving" | "saved" | "failed";

/**
 * One page of the notebook: the tree beside it, its place and numbers above, and the document,
 * where the roadmap board and the flashcards are blocks among the notes.
 *
 * A topic shows its links (goal, category, habit) where a node shows its status. A page that has
 * never been written in starts with a choice of what to add first, because an empty editor gives
 * no hint that a board can live in it.
 */
export default function NotebookPageView() {
    const { pageId } = useParams<{ pageId: string }>();
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const page = useSelector((state: RootState) => (pageId ? state.notebook.pages[pageId] : undefined));
    const [error, setError] = useState<ApiErrorPayload | null>(null);
    const [save, setSave] = useState<SaveState>("idle");
    const [title, setTitle] = useState("");
    const [explaining, setExplaining] = useState<string | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    // The page the delete dialog was opened for, not "whatever page is on screen": the dialog
    // must never be able to act on a page the person did not choose.
    const [deleting, setDeleting] = useState<{ id: string; title: string; parentId: string | null } | null>(null);
    const [editorKey, setEditorKey] = useState(0);
    const [pickingIcon, setPickingIcon] = useState(false);
    const changeStatus = useStatusChange();
    const { start, timer } = useNotebookFocus();
    // The page reserves its own bottom space (see the main element), so the shell's spacer goes.
    useNoDesktopSpacer();

    const load = useCallback(async () => {
        if (!pageId) return;
        const response = await getPage(pageId, t);
        if (response.success) {
            dispatch(enterNotebookPage(response.success));
            setTitle(response.success.title);
            setError(null);
        } else {
            setError(response.error ?? null);
        }
    }, [pageId, t, dispatch]);

    useEffect(() => {
        setExplaining(null);
        void load();
    }, [load]);

    const onSave = useCallback(
        async (json: string) => {
            if (!pageId) return;
            setSave("saving");
            const response = await savePageContent(pageId, json, t);
            setSave(response.success ? "saved" : "failed");
        },
        [pageId, t]
    );

    const saveTitle = async () => {
        if (!page || !title.trim() || title.trim() === page.title) {
            setTitle(page?.title ?? "");
            return;
        }
        const response = await updatePage(page.id, { title: title.trim() }, t);
        if (response.success) {
            dispatch(enterNotebookPage(response.success));
            const { id, title: saved, icon } = response.success;
            dispatch(notebookPageDetailsChanged({ pageId: id, title: saved, icon }));
        }
    };

    /** A blank icon clears it on the server, and the default comes back. */
    const changeIcon = async (icon: string | null) => {
        if (!page) return;
        setPickingIcon(false);
        const response = await updatePage(page.id, { icon: icon ?? "" }, t);
        if (!response.success) {
            toast.error(getFriendlyErrorMessage(t, response.error));
            return;
        }
        dispatch(enterNotebookPage(response.success));
        dispatch(notebookPageDetailsChanged({ pageId: response.success.id, title: response.success.title, icon: response.success.icon }));
    };

    /** The first-block chooser for an empty page writes the document and reloads the editor. */
    const startWith = async (type: typeof BOARD_BLOCK_TYPE | "flashcards" | "paragraph") => {
        if (!page) return;
        const content = JSON.stringify(type === "paragraph" ? [{ type: "paragraph" }] : [{ type }, { type: "paragraph" }]);
        const response = await savePageContent(page.id, content, t);
        if (response.success) {
            dispatch(enterNotebookPage({ ...page, content }));
            setEditorKey((k) => k + 1);
        }
    };

    // This screen stays mounted when the route moves to another page, so what belonged to the
    // page that was here goes with it. Reported in local testing: after a delete the dialog was
    // still open over the parent, now asking to delete the parent.
    useEffect(() => {
        setDeleting(null);
        setMenuOpen(false);
        setExplaining(null);
        setPickingIcon(false);
    }, [pageId]);

    const remove = async () => {
        if (!deleting) return;
        const target = deleting;
        setDeleting(null);
        const response = await deletePage(target.id, t);
        if (response.error) {
            toast.error(getFriendlyErrorMessage(t, response.error));
            return;
        }
        dispatch(removeNotebookPage(target.id));
        navigate(target.parentId ? `/notebook/${target.parentId}` : "/notebook");
    };

    if (error) {
        return (
            <div className="px-4 py-6 lg:px-7">
                <ErrorNotice error={error} />
                <Link to="/notebook" className="mt-3 inline-block text-sm font-semibold text-accent">{t("NotebookAllTopics")}</Link>
            </div>
        );
    }
    if (!page || !pageId) {
        return <div className="px-4 py-6 text-sm text-text-2 lg:px-7">{t("NotebookLoading")}</div>;
    }

    const topicId = page.kind === "TOPIC" ? page.id : page.topicId!;
    const timerHere = timer && !timer.finished && timer.notebookPageId === page.id;
    // The timer pill floats over the bottom of the screen while any cycle runs.
    const timerRunning = Boolean(timer && !timer.finished);
    const blank = !page.content || page.content === "[]";

    return (
        <div className="flex min-h-[calc(100vh-5rem)] flex-col bg-bg text-text lg:min-h-screen lg:flex-row" data-testid="notebook-page">
            {/* On desktop the shell's bottom spacer is off for this page and the page keeps its own
                space: the content column ends with the editor's empty trailing line and 40px, more
                while the timer pill floats over the bottom. The tree is a full screen tall and sticky,
                and the divider lives on its wrapper, which stretches with the page. */}
            <div className="border-b border-border px-4 py-3 lg:border-b-0 lg:border-r lg:p-0">
                <PageTree topicId={topicId} currentPageId={page.id} />
            </div>
            <main className={`min-w-0 flex-1 px-4 pb-6 pt-5 lg:px-10 ${timerRunning ? "lg:pb-28" : "lg:pb-10"}`}>
                <div className="mx-auto max-w-[880px]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <nav aria-label={t("NotebookBreadcrumb")} className="flex min-w-0 flex-wrap items-center gap-1.5 text-[13px] text-text-2">
                            <Link to="/notebook" className="hover:text-text">{t("Notebook")}</Link>
                            {page.breadcrumb.map((crumb, i) => (
                                <span key={crumb.id} className="flex items-center gap-1.5">
                                    <ChevronRight size={14} className="text-text-3" aria-hidden="true" />
                                    {i === page.breadcrumb.length - 1 ? (
                                        <span className="font-semibold text-text">{crumb.title}</span>
                                    ) : (
                                        <Link to={`/notebook/${crumb.id}`} className="hover:text-text">{crumb.title}</Link>
                                    )}
                                </span>
                            ))}
                        </nav>
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-text-2" aria-live="polite" data-testid="save-state">
                                {save === "saving" ? t("NotebookSaving") : save === "saved" ? t("NotebookSaved") : save === "failed" ? t("NotebookSaveFailed") : ""}
                            </span>
                            <Link to={`/notebook/${page.id}/study`} data-testid="open-study-room"
                                className="inline-flex h-[34px] items-center gap-1.5 rounded-control bg-accent-soft px-3 text-[13px] font-semibold text-accent">
                                <Sparkles size={14} aria-hidden="true" />{t("NotebookStudyRoom")}
                            </Link>
                            <button type="button" onClick={() => start({ id: page.id, title: page.title }, page.habit?.id)}
                                disabled={!!timerHere} data-testid="page-focus"
                                className="inline-flex h-[34px] items-center gap-1.5 rounded-control bg-accent px-3 text-[13px] font-semibold text-on-accent disabled:opacity-70">
                                <Timer size={14} aria-hidden="true" />{timerHere ? t("NotebookFocusRunning") : t("NotebookFocus25")}
                            </button>
                            <div className="relative">
                                <button type="button" aria-label={t("NotebookMoreActions")} aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}
                                    className="flex h-[34px] w-[34px] items-center justify-center rounded-control text-text-2 hover:bg-surface-2">
                                    <Ellipsis size={16} aria-hidden="true" />
                                </button>
                                {menuOpen && (
                                    <div className="absolute right-0 top-10 z-20 w-56 rounded-card border border-border bg-surface p-1 shadow-surface">
                                        <button type="button" onClick={() => { setMenuOpen(false); setDeleting({ id: page.id, title: page.title, parentId: page.parentId }); }} data-testid="page-delete"
                                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger/10">
                                            <Trash2 size={14} aria-hidden="true" />{page.kind === "TOPIC" ? t("NotebookDeleteTopic") : t("NotebookDeletePage")}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-col gap-3.5">
                        <button type="button" onClick={() => setPickingIcon(true)} aria-label={t("NotebookChangeIcon")} title={t("NotebookChangeIcon")}
                            data-testid="page-icon"
                            className="flex h-14 w-14 items-center justify-center rounded-card bg-accent-soft text-accent hover:ring-2 hover:ring-border">
                            <NotebookIcon icon={page.icon} size={28} fallback={
                                page.kind === "TOPIC" ? <Layers size={28} aria-hidden="true" />
                                    : page.hasBoard ? <Workflow size={28} aria-hidden="true" /> : <FileText size={28} aria-hidden="true" />
                            } />
                        </button>
                        <PageIconPicker isOpen={pickingIcon} current={page.icon} onPick={(icon) => void changeIcon(icon)} onClose={() => setPickingIcon(false)} />
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={saveTitle}
                            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                            maxLength={255}
                            aria-label={t("NotebookPageTitle")}
                            data-testid="page-title"
                            className="w-full bg-transparent text-[34px] font-bold leading-10 tracking-[-0.025em] text-text outline-none"
                        />
                    </div>

                    <dl className="mt-4 grid grid-cols-[120px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 text-sm">
                        <dt className="text-text-2">{t("NotebookProgress")}</dt>
                        <dd className="m-0 flex items-center gap-2.5" data-testid="page-progress">
                            <Ring size={22} state={page.status === "DONE" ? "done" : "progress"} progress={progressShare(page.progress)} />
                            <span>
                                <b className="font-semibold">{Math.round(progressShare(page.progress) * 100)}%</b>{" "}
                                <span className="text-text-2">{t("NotebookProgressLine", { done: page.progress.done, total: page.progress.total })}</span>
                            </span>
                        </dd>
                        {page.kind === "TOPIC" ? (
                            <TopicLinks topic={page} />
                        ) : (
                            <>
                                <dt className="text-text-2">{t("NotebookStatus")}</dt>
                                <dd className="m-0 max-w-sm">
                                    <StatusPicker status={page.status} manual={page.statusManual} hasBoard={page.hasBoard} compact
                                        onChange={(choice) => void changeStatus(page.id, choice).then(() => load())} />
                                </dd>
                            </>
                        )}
                        <dt className="text-text-2">{t("NotebookStudyLine")}</dt>
                        <dd className="m-0 flex flex-wrap gap-1.5">
                            <span className="inline-flex h-[26px] items-center gap-1.5 rounded-full bg-surface-2 px-2.5 text-[13px] font-semibold text-text-2">
                                <Timer size={13} aria-hidden="true" /><span className="font-mono">{formatMinutes(page.focusMinutes)}</span> {t("NotebookFocused")}
                            </span>
                            {page.cardsDue > 0 && (
                                <Link to={`/notebook/review?page=${page.id}`} className="inline-flex h-[26px] items-center rounded-full bg-flame-soft px-2.5 text-[13px] font-semibold text-flame">
                                    {t("NotebookDueCount", { count: page.cardsDue })}
                                </Link>
                            )}
                            <Link to={`/notebook/${page.id}/study`} className="inline-flex h-[26px] items-center rounded-full bg-surface-2 px-2.5 text-[13px] font-semibold text-text-2">
                                {t("NotebookSourcesCount", { count: page.sourcesCount })}
                            </Link>
                        </dd>
                    </dl>

                    {blank && (
                        <div className="mt-6 flex flex-wrap gap-2" data-testid="page-starters">
                            <button type="button" onClick={() => void startWith(BOARD_BLOCK_TYPE)} data-testid="start-board"
                                className="inline-flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-2 text-sm font-semibold text-text hover:bg-surface-2">
                                <Workflow size={15} className="text-accent" aria-hidden="true" />{t("NotebookStartBoard")}
                            </button>
                            <button type="button" onClick={() => void startWith("flashcards")}
                                className="inline-flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-2 text-sm font-semibold text-text hover:bg-surface-2">
                                <Layers size={15} className="text-xp" aria-hidden="true" />{t("NotebookStartCards")}
                            </button>
                        </div>
                    )}

                    <div className="mt-6">
                        <NotebookEditor
                            key={`${page.id}-${editorKey}`}
                            pageId={page.id}
                            pageTitle={page.title}
                            cardsTotal={page.cardsTotal}
                            content={page.content}
                            onSave={onSave}
                            onExplain={setExplaining}
                        />
                    </div>
                    {explaining && (
                        <ExplainPanel
                            pageId={page.id}
                            text={explaining}
                            onClose={() => setExplaining(null)}
                            onAppended={() => {
                                setExplaining(null);
                                void load().then(() => setEditorKey((k) => k + 1));
                            }}
                        />
                    )}
                </div>
            </main>

            <Modal isOpen={deleting !== null} onClose={() => setDeleting(null)} labelledBy="delete-page-title">
                <div className="flex w-full flex-col gap-3">
                    <h2 id="delete-page-title" className="text-lg font-semibold text-text">{t("NotebookDeleteTitle", { title: deleting?.title ?? "" })}</h2>
                    <p className="text-sm text-text-2">{t("NotebookDeleteExplain")}</p>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setDeleting(null)} className="rounded-control px-4 py-2 text-sm font-semibold text-text-2 hover:bg-surface-2">{t("Cancel")}</button>
                        <button type="button" onClick={() => void remove()} data-testid="page-delete-confirm" className="rounded-control bg-danger px-4 py-2 text-sm font-semibold text-on-accent">{t("Delete")}</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
