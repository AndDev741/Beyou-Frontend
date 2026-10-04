import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChevronRight, LayoutGrid, Link2, Minimize2, Plus, SquareDashed, Sparkles } from "lucide-react";
import type { RootState } from "@beyou/state/rootReducer";
import { enterNotebookPage } from "@beyou/state";
import { getPage } from "@beyou/api/notebook";
import type { BoardNode } from "@beyou/types/notebook/notebook";
import RoadmapBoard from "../../components/notebook/board/RoadmapBoard";
import NodeInspector from "../../components/notebook/board/NodeInspector";
import SuggestionsPanel from "../../components/notebook/board/SuggestionsPanel";
import LinkPagePicker from "../../components/notebook/board/LinkPagePicker";
import { useBoard } from "../../components/notebook/board/useBoard";
import useUiRefresh from "../../hooks/useUiRefresh";
import Modal from "../../components/modals/Modal";

type Tool = "node" | "section" | "link" | "suggest" | null;

/**
 * A page's board on the whole screen: room to pan, an inspector for the selected node, and the
 * tools the inline block leaves out (sections, links, removal).
 *
 * Covers the shell like the focus screen does (`fixed inset-0 z-[70]`), and leaves on Escape
 * unless a dialog is open, for the same reason the focus screen gives.
 */
export default function NotebookBoardFocus() {
    const { pageId } = useParams<{ pageId: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const page = useSelector((state: RootState) => (pageId ? state.notebook.pages[pageId] : undefined));
    const boardApi = useBoard(pageId);
    const { board } = boardApi;
    useUiRefresh(boardApi.refreshUi);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [tool, setTool] = useState<Tool>(null);
    const [draft, setDraft] = useState("");

    useEffect(() => {
        if (!pageId) return;
        void getPage(pageId, t).then((response) => {
            if (response.success) dispatch(enterNotebookPage(response.success));
        });
    }, [pageId, t, dispatch]);

    const leave = useCallback(() => navigate(`/notebook/${pageId}`), [navigate, pageId]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            if (document.querySelector('[role="dialog"]')) return;
            leave();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [leave]);

    const selected = board?.nodes.find((n) => n.id === selectedId) ?? null;
    const onBoard = useMemo(
        () => new Set((board?.nodes ?? []).map((n) => n.pageId).filter((id): id is string => !!id).concat(pageId ?? "")),
        [board, pageId]
    );

    const submitDraft = async () => {
        if (tool === "node") {
            const node = await boardApi.addNode(draft);
            if (node) setSelectedId(node.id);
        } else if (tool === "section") {
            await boardApi.addSection(draft);
        }
        setDraft("");
        setTool(null);
    };

    const remove = async (node: BoardNode, deletePage: boolean) => {
        await boardApi.removeNode(node, deletePage);
        setSelectedId(null);
    };

    const toolButton = (id: Exclude<Tool, null>, label: string, Icon: typeof Plus, testId: string) => (
        <button
            type="button"
            aria-label={label}
            title={label}
            aria-pressed={tool === id}
            data-testid={testId}
            onClick={() => setTool((current) => (current === id ? null : id))}
            className={`flex h-8 w-9 items-center justify-center rounded-[9px] ${tool === id ? "bg-accent-soft text-accent" : "text-text-2 hover:bg-surface"}`}
        >
            <Icon size={16} aria-hidden="true" />
        </button>
    );

    return (
        <div className="fixed inset-0 z-[70] flex flex-col bg-bg" role="region" aria-label={t("NotebookBoardFocusTitle")} data-testid="board-focus-screen">
            <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2">
                <div className="flex min-w-0 items-center gap-2.5">
                    <button type="button" onClick={leave} aria-label={t("NotebookBackToPage")} className="flex h-9 w-9 items-center justify-center rounded-control text-text-2 hover:bg-surface-2">
                        <ArrowLeft size={18} aria-hidden="true" />
                    </button>
                    <nav aria-label={t("NotebookBreadcrumb")} className="flex min-w-0 items-center gap-1.5 text-sm text-text-2">
                        {(page?.breadcrumb ?? []).map((crumb, i, all) => (
                            <span key={crumb.id} className="flex min-w-0 items-center gap-1.5">
                                {i < all.length - 1 ? (
                                    <Link to={`/notebook/${crumb.id}`} className="truncate hover:text-text">{crumb.title}</Link>
                                ) : (
                                    <span className="truncate font-semibold text-text">{crumb.title}</span>
                                )}
                                <ChevronRight size={14} className="shrink-0 text-text-3" aria-hidden="true" />
                            </span>
                        ))}
                        <span className="font-semibold text-text">{t("NotebookBoardTitle")}</span>
                    </nav>
                </div>
                <div role="toolbar" aria-label={t("NotebookBoardTools")} className="flex items-center gap-0.5 rounded-xl border border-border bg-surface-2 p-[3px]">
                    {toolButton("node", t("NotebookToolAddNode"), Plus, "tool-add-node")}
                    {toolButton("section", t("NotebookToolAddSection"), SquareDashed, "tool-add-section")}
                    {toolButton("link", t("NotebookToolLinkPage"), Link2, "tool-link-page")}
                    <button type="button" aria-label={t("NotebookBoardTidy")} title={t("NotebookBoardTidy")} onClick={() => void boardApi.tidy()}
                        className="flex h-8 w-9 items-center justify-center rounded-[9px] text-text-2 hover:bg-surface">
                        <LayoutGrid size={16} aria-hidden="true" />
                    </button>
                    <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
                    <button type="button" onClick={() => setTool((c) => (c === "suggest" ? null : "suggest"))} aria-pressed={tool === "suggest"}
                        className="flex h-8 items-center gap-1.5 rounded-[9px] px-2.5 text-[13px] font-semibold text-accent hover:bg-surface">
                        <Sparkles size={15} aria-hidden="true" />{t("NotebookSuggestNodes")}
                    </button>
                </div>
                <button type="button" onClick={leave} className="inline-flex h-9 items-center gap-2 rounded-control border border-border px-3 text-[13px] font-semibold text-text hover:bg-surface-2">
                    <Minimize2 size={14} aria-hidden="true" />{t("NotebookExitFocus")}
                    <kbd className="rounded border border-border px-1.5 font-mono text-[11px] text-text-2">Esc</kbd>
                </button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                <div className="relative min-h-[420px] min-w-0 flex-1">
                    {(tool === "node" || tool === "section") && (
                        <form
                            className="absolute left-4 top-4 z-10 flex w-[min(360px,calc(100%-2rem))] gap-2 rounded-card border border-border bg-surface p-2 shadow-surface"
                            onSubmit={(e) => {
                                e.preventDefault();
                                void submitDraft();
                            }}
                        >
                            <input
                                autoFocus
                                value={draft}
                                maxLength={255}
                                onChange={(e) => setDraft(e.target.value)}
                                placeholder={tool === "node" ? t("NotebookBoardNodePlaceholder") : t("NotebookSectionPlaceholder")}
                                aria-label={tool === "node" ? t("NotebookBoardNodePlaceholder") : t("NotebookSectionPlaceholder")}
                                data-testid="focus-draft-input"
                                className="h-9 flex-1 rounded-control border border-border bg-bg px-3 text-sm text-text outline-none focus:border-accent"
                            />
                            <button type="submit" disabled={!draft.trim()} className="rounded-control bg-accent px-3 text-sm font-semibold text-on-accent disabled:opacity-60">
                                {t("NotebookAdd")}
                            </button>
                        </form>
                    )}
                    {tool === "suggest" && pageId && (
                        <div className="absolute left-4 top-4 z-10 w-[min(360px,calc(100%-2rem))]">
                            <SuggestionsPanel pageId={pageId} onKeep={(title) => boardApi.addNode(title)} onClose={() => setTool(null)} />
                        </div>
                    )}
                    {board && (
                        <RoadmapBoard
                            board={board}
                            mode="focus"
                            ariaLabel={t("NotebookBoardTitle")}
                            selectedNodeId={selectedId}
                            onSelect={(node) => setSelectedId(node?.id ?? null)}
                            onOpenPage={(id) => navigate(`/notebook/${id}`)}
                            onMove={boardApi.move}
                            onResizeSection={boardApi.resizeSection}
                            onConnect={boardApi.connect}
                            onDeleteEdge={boardApi.removeEdge}
                            onDeleteNode={(node) => setSelectedId(node.id)}
                        />
                    )}
                </div>
                {selected && board && (
                    <NodeInspector
                        board={board}
                        node={selected}
                        habitId={page?.habit?.id ?? null}
                        onClose={() => setSelectedId(null)}
                        onDelete={remove}
                        onRenameSection={boardApi.renameSection}
                    />
                )}
            </div>

            <Modal isOpen={tool === "link"} onClose={() => setTool(null)} labelledBy="link-page-title">
                <div className="flex w-[min(420px,85vw)] flex-col gap-3">
                    <h2 id="link-page-title" className="text-lg font-semibold text-text">{t("NotebookToolLinkPage")}</h2>
                    <p className="text-sm text-text-2">{t("NotebookLinkExplain")}</p>
                    <LinkPagePicker
                        excludeIds={onBoard}
                        onPick={async (id) => {
                            const node = await boardApi.linkPage(id);
                            setTool(null);
                            if (node) setSelectedId(node.id);
                        }}
                    />
                </div>
            </Modal>
        </div>
    );
}
