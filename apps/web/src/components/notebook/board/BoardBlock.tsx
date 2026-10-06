import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutGrid, Maximize2, Plus, Sparkles, Workflow } from "lucide-react";
import useUiRefresh from "../../../hooks/useUiRefresh";
import RoadmapBoard from "./RoadmapBoard";
import SuggestionsPanel from "./SuggestionsPanel";
import { useBoard } from "./useBoard";

/**
 * The roadmap board as a block inside a page: a window onto the board, with the few actions that
 * make sense in a document. Deleting, linking and sections live in focus mode, where there is room
 * for an inspector and nothing to type into by accident.
 *
 * Key and mouse events stop here so the editor around it never treats a drag on the board as a
 * text selection or a Backspace on a node as a deletion in the document.
 */
export default function BoardBlock({ pageId }: { pageId: string }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { board, addNode, move, connect, tidy, refreshUi } = useBoard(pageId);
    useUiRefresh(refreshUi);
    const [adding, setAdding] = useState(false);
    const [title, setTitle] = useState("");
    const [suggesting, setSuggesting] = useState(false);

    const nodes = board?.nodes.filter((n) => n.kind === "PAGE") ?? [];
    const done = nodes.filter((n) => n.status === "DONE").length;
    const studying = nodes.filter((n) => n.status === "STUDYING").length;

    const submit = async () => {
        if (await addNode(title)) {
            setTitle("");
            setAdding(false);
        }
    };

    return (
        <section
            data-testid="board-block"
            aria-label={t("NotebookBoardTitle")}
            contentEditable={false}
            onKeyDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPaste={(e) => e.stopPropagation()}
            className="my-2 w-full overflow-hidden rounded-card border border-border bg-surface"
        >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 pl-4 pr-2">
                <div className="flex flex-wrap items-center gap-2.5">
                    <Workflow size={16} className="text-accent" aria-hidden="true" />
                    <span className="text-sm font-semibold text-text">{t("NotebookBoardTitle")}</span>
                    <span className="text-xs text-text-2">
                        {t("NotebookBoardCounts", { nodes: nodes.length, done, studying })}
                    </span>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                    <button type="button" onClick={() => setAdding((v) => !v)} data-testid="board-add-node"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-text-2 hover:bg-surface-2">
                        <Plus size={14} aria-hidden="true" />{t("NotebookBoardNode")}
                    </button>
                    <button type="button" onClick={() => void tidy()} disabled={nodes.length < 2} data-testid="board-tidy"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-text-2 hover:bg-surface-2 disabled:opacity-50">
                        <LayoutGrid size={14} aria-hidden="true" />{t("NotebookBoardTidy")}
                    </button>
                    <button type="button" onClick={() => setSuggesting((v) => !v)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-accent hover:bg-accent-soft">
                        <Sparkles size={14} aria-hidden="true" />{t("NotebookSuggestNodes")}
                    </button>
                    <Link to={`/notebook/${pageId}/board`} data-testid="board-focus"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-[13px] font-semibold text-text hover:bg-surface-2">
                        <Maximize2 size={14} aria-hidden="true" />{t("NotebookBoardFocus")}
                    </Link>
                </div>
            </div>
            {adding && (
                <form
                    className="flex gap-2 border-b border-border bg-bg px-4 py-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void submit();
                    }}
                >
                    <input
                        autoFocus
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={255}
                        placeholder={t("NotebookBoardNodePlaceholder")}
                        aria-label={t("NotebookBoardNodePlaceholder")}
                        data-testid="board-node-title"
                        className="h-9 flex-1 rounded-control border border-border bg-surface px-3 text-sm text-text outline-none focus:border-accent"
                    />
                    <button type="submit" disabled={!title.trim()} data-testid="board-node-submit"
                        className="rounded-control bg-accent px-4 text-sm font-semibold text-on-accent disabled:opacity-60">
                        {t("NotebookAdd")}
                    </button>
                </form>
            )}
            {suggesting && (
                <div className="border-b border-border bg-bg p-3">
                    <SuggestionsPanel pageId={pageId} onKeep={(s) => addNode(s)} onClose={() => setSuggesting(false)} />
                </div>
            )}
            <div className="relative h-[380px]">
                {board && nodes.length === 0 && (
                    <p className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 text-center text-sm text-text-2">
                        {t("NotebookBoardEmpty")}
                    </p>
                )}
                {board && (
                    <RoadmapBoard
                        board={board}
                        mode="inline"
                        ariaLabel={t("NotebookBoardTitle")}
                        onOpenPage={(id) => navigate(`/notebook/${id}`)}
                        onMove={move}
                        onConnect={connect}
                    />
                )}
                <p className="pointer-events-none absolute bottom-2 left-4 text-xs text-text-2">{t("NotebookBoardHint")}</p>
            </div>
        </section>
    );
}
