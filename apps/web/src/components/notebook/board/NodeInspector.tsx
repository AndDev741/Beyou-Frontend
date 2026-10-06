import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { FileText, Timer, Trash2, X } from "lucide-react";
import type { Board, BoardNode, NotebookPage } from "@beyou/types/notebook/notebook";
import { getPage } from "@beyou/api/notebook";
import { enterNotebookPage, prerequisitesOf } from "@beyou/state";
import StatusPicker from "../StatusPicker";
import { useStatusChange } from "../useStatusChange";
import { useNotebookFocus } from "../useNotebookFocus";
import Modal from "../../modals/Modal";

/**
 * The panel beside the focus board for the node that is selected: its status, a way into its
 * page, a focus session, the numbers that say how it is going, and what comes before and after.
 */
export default function NodeInspector({
    board,
    node,
    habitId,
    onClose,
    onDelete,
    onRenameSection,
}: {
    board: Board;
    node: BoardNode;
    habitId?: string | null;
    onClose: () => void;
    onDelete: (node: BoardNode, deletePage: boolean) => void;
    onRenameSection: (nodeId: string, label: string) => void;
}) {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const changeStatus = useStatusChange();
    const { start } = useNotebookFocus();
    const [page, setPage] = useState<NotebookPage | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [label, setLabel] = useState(node.title);

    useEffect(() => {
        setLabel(node.title);
        if (!node.pageId) {
            setPage(null);
            return;
        }
        let live = true;
        void getPage(node.pageId, t).then((response) => {
            if (live && response.success) {
                setPage(response.success);
                dispatch(enterNotebookPage(response.success));
            }
        });
        return () => {
            live = false;
        };
    }, [node.pageId, node.title, node.status, t, dispatch]);

    const before = prerequisitesOf(board, node.id);
    const after = board.nodes.filter((n) => board.edges.some((e) => e.source === node.id && e.target === n.id));

    return (
        <aside aria-label={t("NotebookInspectorTitle")} data-testid="node-inspector"
            className="flex w-full flex-col gap-4 overflow-y-auto border-l border-border bg-surface p-5 lg:w-[340px] lg:shrink-0">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-2">
                    {node.kind === "SECTION" ? t("NotebookInspectorSection") : t("NotebookInspectorTitle")}
                </span>
                <button type="button" onClick={onClose} aria-label={t("Close")} className="rounded-lg p-1.5 text-text-2 hover:bg-surface-2">
                    <X size={16} aria-hidden="true" />
                </button>
            </div>

            {node.kind === "SECTION" ? (
                <form
                    className="flex flex-col gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (label.trim()) onRenameSection(node.id, label.trim());
                    }}
                >
                    <label className="text-xs font-semibold text-text-2" htmlFor="section-label">{t("NotebookSectionLabel")}</label>
                    <input id="section-label" value={label} maxLength={255} onChange={(e) => setLabel(e.target.value)}
                        className="h-10 rounded-control border border-border bg-bg px-3 text-sm text-text outline-none focus:border-accent" />
                    <button type="submit" className="self-start rounded-control bg-accent-soft px-3 py-1.5 text-sm font-semibold text-accent">
                        {t("NotebookSave")}
                    </button>
                </form>
            ) : (
                <>
                    <div className="flex flex-col gap-2.5">
                        <h2 className="text-[22px] font-semibold leading-7 tracking-[-0.015em] text-text">{node.title}</h2>
                        {node.linked && node.homeTopicTitle && (
                            <p className="text-xs text-text-2">{t("NotebookInspectorLinkedFrom", { topic: node.homeTopicTitle })}</p>
                        )}
                        <StatusPicker
                            status={node.status}
                            manual={page?.statusManual ?? false}
                            hasBoard={node.hasBoard}
                            onChange={(choice) => node.pageId && void changeStatus(node.pageId, choice)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Link to={`/notebook/${node.pageId}`} data-testid="inspector-open-page"
                            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-control bg-accent text-sm font-semibold text-on-accent">
                            <FileText size={15} aria-hidden="true" />{t("NotebookOpenPage")}
                        </Link>
                        <button type="button" onClick={() => node.pageId && start({ id: node.pageId, title: node.title }, habitId)}
                            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-control border border-border text-sm font-semibold text-text hover:bg-surface-2">
                            <Timer size={15} aria-hidden="true" />{t("NotebookFocus25")}
                        </button>
                    </div>
                    <dl className="grid grid-cols-3 gap-2">
                        <Stat value={formatMinutes(page?.focusMinutes ?? 0)} label={t("NotebookStatFocused")} />
                        <Stat value={`${page?.cardsTotal ?? 0}`} extra={page?.cardsDue ? t("NotebookStatDue", { n: page.cardsDue }) : undefined} label={t("NotebookStatCards")} />
                        <Stat value={`${page?.sourcesCount ?? 0}`} label={t("NotebookStatSources")} />
                    </dl>
                    {node.hasBoard && node.progress && (
                        <p className="text-sm text-text">
                            <span className="font-semibold">{t("NotebookInspectorBoardInside")}</span>{" "}
                            <span className="text-text-2">{t("NotebookProgressOf", { done: node.progress.done, total: node.progress.total })}</span>
                        </p>
                    )}
                    <dl className="flex flex-col gap-1.5 text-[13px]">
                        <div className="flex gap-2"><dt className="w-16 text-text-2">{t("NotebookInspectorNeeds")}</dt>
                            <dd className="text-text">{before.length ? before.map((n) => n.title).join(", ") : t("NotebookNone")}</dd></div>
                        <div className="flex gap-2"><dt className="w-16 text-text-2">{t("NotebookInspectorUnlocks")}</dt>
                            <dd className="text-text">{after.length ? after.map((n) => n.title).join(", ") : t("NotebookNone")}</dd></div>
                    </dl>
                    <p className="mt-auto rounded-control border border-border p-3 text-[13px] leading-5 text-text-2">
                        {t("NotebookInspectorAutoHint")}
                    </p>
                </>
            )}

            <button type="button" onClick={() => setConfirming(true)} data-testid="inspector-delete"
                className="inline-flex items-center gap-2 self-start rounded-control px-2 py-1.5 text-sm font-semibold text-danger hover:bg-danger/10">
                <Trash2 size={15} aria-hidden="true" />{t("NotebookRemoveFromBoard")}
            </button>

            <Modal isOpen={confirming} onClose={() => setConfirming(false)} labelledBy="remove-node-title">
                <div className="flex w-full flex-col gap-3 p-1">
                    <h3 id="remove-node-title" className="text-lg font-semibold text-text">{t("NotebookRemoveTitle", { title: node.title })}</h3>
                    <p className="text-sm text-text-2">
                        {node.kind === "PAGE" && !node.linked ? t("NotebookRemoveExplain") : t("NotebookRemoveLinkedExplain")}
                    </p>
                    <div className="flex flex-wrap justify-end gap-2">
                        <button type="button" onClick={() => setConfirming(false)} className="rounded-control px-4 py-2 text-sm font-semibold text-text-2 hover:bg-surface-2">
                            {t("Cancel")}
                        </button>
                        <button type="button" data-testid="remove-node-only"
                            onClick={() => { setConfirming(false); onDelete(node, false); }}
                            className="rounded-control border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface-2">
                            {t("NotebookRemoveOnly")}
                        </button>
                        {node.kind === "PAGE" && !node.linked && (
                            <button type="button" data-testid="remove-node-and-page"
                                onClick={() => { setConfirming(false); onDelete(node, true); }}
                                className="rounded-control bg-danger px-4 py-2 text-sm font-semibold text-on-accent">
                                {t("NotebookRemoveWithPage")}
                            </button>
                        )}
                    </div>
                </div>
            </Modal>
        </aside>
    );
}

function Stat({ value, label, extra }: { value: string; label: string; extra?: string }) {
    return (
        <div className="rounded-xl bg-surface-2 p-2.5">
            <dd className="font-mono text-base font-semibold text-text">
                {value}
                {extra && <span className="text-xs text-flame"> · {extra}</span>}
            </dd>
            <dt className="mt-0.5 text-[11px] text-text-2">{label}</dt>
        </div>
    );
}

export function formatMinutes(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
}
