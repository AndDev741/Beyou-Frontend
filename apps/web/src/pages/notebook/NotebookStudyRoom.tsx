import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Columns2, MessagesSquare, NotebookPen, Sparkles } from "lucide-react";
import type { NotebookPage, NotebookSource, StudyRoom, StudySetup as Setup } from "@beyou/types/notebook/notebook";
import { enterNotebookPage } from "@beyou/state";
import type { ApiErrorPayload } from "@beyou/api/apiError";
import { getStudyRoom } from "@beyou/api/notebook";
import ErrorNotice from "../../components/ErrorNotice";
import SourcesPanel from "../../components/notebook/study/SourcesPanel";
import ChatPanel from "../../components/notebook/study/ChatPanel";
import StudioPanel from "../../components/notebook/study/StudioPanel";
import StudySetup, { StudySetupBar } from "../../components/notebook/study/StudySetup";
import { PanelRail, ResizeHandle } from "../../components/notebook/study/StudyColumns";
import StudyNotes from "../../components/notebook/study/StudyNotes";
import { RAIL_WIDTH, STUDY_VIEWS, useStudyLayout, useStudyView, type StudyView } from "../../components/notebook/study/studyLayout";

const VIEW_ICONS: Record<StudyView, typeof Columns2> = { room: MessagesSquare, split: Columns2, notes: NotebookPen };
const VIEW_LABELS: Record<StudyView, string> = {
    room: "NotebookStudyViewRoom",
    split: "NotebookStudyViewSplit",
    notes: "NotebookStudyViewNotes",
};

/**
 * The study room for one page: its sources on the left, a conversation grounded in them in the
 * middle, and the studio on the right.
 *
 * Before the first question the middle column is the room's setup (StudySetup): a goal, which
 * notes to read, and sources to add. It comes back with "Edit" on the line above the chat. The
 * source list is held here, so the panel and the setup both see a source the other added.
 *
 * On desktop the side panels can be resized by dragging the bars beside the chat, or folded into
 * thin rails to give the chat the screen (useStudyLayout keeps the choice in this browser).
 *
 * The header switches what the room shows: the room, the page's notes beside the chat, or the
 * notes alone (useStudyView, kept per browser too). Every panel stays mounted across a switch and
 * is only hidden, because each holds what happened since the room opened (the conversation, the
 * studio's outputs); remounting would bring back the room as it was loaded. The notes are the
 * exception: they mount when shown and read the page fresh.
 *
 * On desktop the room is exactly one screen tall and only its columns scroll, each on its own:
 * the header, the sources and the studio stay where they are while a long conversation scrolls,
 * so changing a source or leaving never means scrolling back to the top. Below `lg` the columns
 * stack and the room scrolls as one page, with the header pinned.
 *
 * It covers the app shell like the focus screen does (`fixed inset-0`), because a study session
 * is one thing at a time and the sidebar is a way out of it. Escape leaves for the page, unless a
 * dialog is open: the shared `Modal` closes on Escape too, and one keypress must not do both.
 */
export default function NotebookStudyRoom() {
    const { pageId } = useParams<{ pageId: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [room, setRoom] = useState<StudyRoom | null>(null);
    const [error, setError] = useState<ApiErrorPayload | null>(null);
    const [cards, setCards] = useState({ total: 0, due: 0 });
    const [sources, setSources] = useState<NotebookSource[]>([]);
    const [setup, setSetup] = useState<Setup | null>(null);
    const [editingSetup, setEditingSetup] = useState(false);
    const { layout, resize, toggle, reset } = useStudyLayout();
    const { view, setView } = useStudyView();
    const dispatch = useDispatch();

    const pagePath = `/notebook/${pageId ?? ""}`;
    const leave = useCallback(() => navigate(pagePath), [navigate, pagePath]);

    useEffect(() => {
        if (!pageId) return;
        let cancelled = false;
        (async () => {
            const response = await getStudyRoom(pageId, t);
            if (cancelled) return;
            if (response.success) {
                setRoom(response.success);
                setCards({ total: response.success.cardsTotal, due: response.success.cardsDue });
                setSources(response.success.sources);
                setSetup(response.success.setup);
            } else {
                setError(response.error ?? null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [pageId, t]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            // A modal, or an inline layer such as an open citation, takes this press for itself.
            if (document.querySelector('[role="dialog"], [data-escape-layer]')) return;
            // So does the notes editor: Escape closes its menus, and nobody writing means "leave".
            if ((event.target as Element | null)?.closest?.(".bn-container")) return;
            leave();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [leave]);

    // The page after "Save to page", into the store: open notes merge it in from there.
    const onSavedToPage = useCallback((saved: NotebookPage) => dispatch(enterNotebookPage(saved)), [dispatch]);

    const onSourceAdded = useCallback((source: NotebookSource) => setSources((current) => [...current, source]), []);

    // Cards made in the chat or the studio are new, so they are due today.
    const onCardsMade = useCallback(
        (count: number) => setCards((current) => ({ total: current.total + count, due: current.due + count })),
        []
    );

    return (
        <div
            className="fixed inset-0 z-[70] overflow-y-auto bg-bg text-text"
            role="region"
            aria-label={t("NotebookStudyRoom")}
            data-testid="study-room"
        >
            <div className="flex min-h-full flex-col lg:h-full">
                <header className="sticky top-0 z-20 flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <Link
                            to={pagePath}
                            aria-label={t("NotebookStudyBackToPage")}
                            className="flex h-9 w-9 items-center justify-center rounded-control text-text-2 hover:bg-surface-2"
                        >
                            <ArrowLeft size={18} aria-hidden="true" />
                        </Link>
                        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-accent-soft text-accent">
                            <Sparkles size={16} aria-hidden="true" />
                        </span>
                        <div className="flex min-w-0 flex-col">
                            <h1 className="truncate text-[15px] font-semibold">
                                {t("NotebookStudyRoom")}
                                {room ? ` · ${room.page.title}` : ""}
                            </h1>
                            {room && room.breadcrumb.length > 0 && (
                                <span className="truncate text-xs text-text-2">
                                    {room.breadcrumb.map((step) => step.title).join(" › ")}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                    <div role="group" aria-label={t("NotebookStudyView")} data-testid="study-view-switch"
                        className="flex gap-0.5 rounded-control bg-surface-2 p-[3px]">
                        {STUDY_VIEWS.map((option) => {
                            const Icon = VIEW_ICONS[option];
                            const active = view === option;
                            return (
                                <button key={option} type="button" aria-pressed={active} onClick={() => setView(option)}
                                    aria-label={t(VIEW_LABELS[option])} title={t(VIEW_LABELS[option])}
                                    data-testid={`study-view-${option}`}
                                    className={`inline-flex h-[30px] items-center gap-1.5 rounded-[8px] px-2.5 text-[13px] font-semibold ${
                                        active ? "bg-surface text-text shadow-surface" : "text-text-2 hover:text-text"}`}>
                                    <Icon size={14} aria-hidden="true" />
                                    <span className="hidden sm:inline">{t(VIEW_LABELS[option])}</span>
                                </button>
                            );
                        })}
                    </div>
                    <Link
                        to={pagePath}
                        className="inline-flex h-9 items-center gap-2 rounded-control border border-border px-3 text-[13px] font-semibold text-text hover:bg-surface-2"
                    >
                        {t("Close")}
                        <kbd className="rounded-[5px] border border-border px-1.5 font-mono text-[11px] text-text-2">Esc</kbd>
                    </Link>
                    </div>
                </header>

                {error && (
                    <div className="p-6">
                        <ErrorNotice error={error} />
                    </div>
                )}

                {!room && !error && (
                    <p className="p-6 text-sm text-text-2" role="status">
                        {t("NotebookStudyLoading")}
                    </p>
                )}

                {room && pageId && setup && (
                    <div
                        className={`flex flex-1 flex-wrap items-stretch gap-4 p-4 lg:min-h-0 lg:flex-nowrap ${view === "room" ? "lg:gap-0" : ""}`}
                        style={{
                            "--study-left": `${layout.leftCollapsed ? RAIL_WIDTH : layout.left}px`,
                            "--study-right": `${layout.rightCollapsed ? RAIL_WIDTH : layout.right}px`,
                        } as CSSProperties}
                        data-view={view}
                    >
                        {view !== "room" && (
                            <div data-testid="study-col-notes"
                                className={view === "split"
                                    ? "flex min-w-0 flex-[999_1_460px] flex-col lg:min-h-0 lg:flex-[1.25_1_0%] lg:overflow-y-auto"
                                    : "flex w-full min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-y-auto"}>
                                <div className={view === "notes" ? "mx-auto flex w-full max-w-[920px] flex-col" : "flex flex-col"}>
                                    <StudyNotes pageId={pageId} />
                                </div>
                            </div>
                        )}
                        <div className={`flex min-w-0 flex-[1_1_280px] flex-col lg:min-h-0 lg:w-[var(--study-left)] lg:flex-none lg:overflow-y-auto ${view === "room" ? "" : "hidden"}`}
                            data-testid="study-col-left">
                            <div className={`flex min-w-0 flex-col ${layout.leftCollapsed ? "lg:hidden" : ""}`}>
                                <SourcesPanel pageId={pageId} initialSources={sources} onChange={setSources} discovery={room.discovery}
                                    onCollapse={() => toggle("left")} />
                            </div>
                            {layout.leftCollapsed && (
                                <PanelRail side="left" label={t("NotebookStudySources")} expandLabel={t("NotebookStudyExpandSources")}
                                    count={sources.length} onExpand={() => toggle("left")} />
                            )}
                        </div>
                        {view === "room" && (
                            <ResizeHandle side="left" width={layout.left} label={t("NotebookStudyResizeSources")}
                                onResize={(from, delta) => resize("left", from, delta)} onReset={() => reset("left")} onToggle={() => toggle("left")} />
                        )}
                        <div data-testid="study-col-chat"
                            className={view === "notes" ? "hidden"
                                : view === "split" ? "flex min-w-0 flex-[999_1_460px] flex-col lg:min-h-0 lg:flex-[1_1_0%] lg:overflow-y-auto"
                                : "flex min-w-0 flex-[999_1_460px] flex-col lg:min-h-0 lg:flex-1 lg:overflow-y-auto"}>
                            {editingSetup || (!setup.configuredAt && room.messages.length === 0) ? (
                                <StudySetup
                                    pageId={pageId}
                                    setup={setup}
                                    scopes={room.scopes}
                                    sources={sources}
                                    discovery={room.discovery}
                                    onSourceAdded={onSourceAdded}
                                    onSaved={(saved) => {
                                        setSetup(saved);
                                        setEditingSetup(false);
                                    }}
                                    onCancel={setup.configuredAt ? () => setEditingSetup(false) : undefined}
                                />
                            ) : (
                                <>
                                    <StudySetupBar setup={setup} onEdit={() => setEditingSetup(true)} />
                                    <ChatPanel
                                        pageId={pageId}
                                        initialMessages={room.messages}
                                        initialOverview={room.overview}
                                        onCardsMade={onCardsMade}
                                        onSavedToPage={onSavedToPage}
                                    />
                                </>
                            )}
                        </div>
                        {view === "room" && (
                            <ResizeHandle side="right" width={layout.right} label={t("NotebookStudyResizeStudio")}
                                onResize={(from, delta) => resize("right", from, delta)} onReset={() => reset("right")} onToggle={() => toggle("right")} />
                        )}
                        <div className={`flex min-w-0 flex-[1_1_300px] flex-col lg:min-h-0 lg:w-[var(--study-right)] lg:flex-none lg:overflow-y-auto ${view === "room" ? "" : "hidden"}`}
                            data-testid="study-col-right">
                            <div className={`flex min-w-0 flex-col ${layout.rightCollapsed ? "lg:hidden" : ""}`}>
                                <StudioPanel
                                    pageId={pageId}
                                    pageTitle={room.page.title}
                                    initialOutputs={room.outputs}
                                    cardsTotal={cards.total}
                                    cardsDue={cards.due}
                                    onCardsMade={onCardsMade}
                                    onCollapse={() => toggle("right")}
                                />
                            </div>
                            {layout.rightCollapsed && (
                                <PanelRail side="right" label={t("NotebookStudyStudio")} expandLabel={t("NotebookStudyExpandStudio")}
                                    onExpand={() => toggle("right")} />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
