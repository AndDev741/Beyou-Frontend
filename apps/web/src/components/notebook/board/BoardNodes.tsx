import { memo } from "react";
import { Handle, NodeResizer, Position, type Node, type NodeProps } from "@xyflow/react";
import { Link2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BoardNode } from "@beyou/types/notebook/notebook";
import { progressShare } from "@beyou/state";
import StatusIcon, { STATUS_LABEL_KEY } from "../StatusIcon";
import NotebookIcon from "../NotebookIcon";
import { NODE_HEIGHT, NODE_WIDTH } from "./boardLayout";

export type PageNodeData = { node: BoardNode; onResizeEnd?: (nodeId: string, width: number, height: number) => void };
export type PageFlowNode = Node<PageNodeData, "page">;
export type SectionFlowNode = Node<PageNodeData, "section">;

/**
 * A page on the board: status glyph, title, and a line saying where it stands. The bar along the
 * bottom is the share of leaves done under it, so a node with a board of its own shows how far
 * that board has got.
 */
export const PageNodeView = memo(function PageNodeView({ data, selected }: NodeProps<PageFlowNode>) {
    const { t } = useTranslation();
    const { node } = data;
    const share = node.status === "DONE" ? 1 : progressShare(node.progress);
    const border =
        selected
            ? "border-2 border-accent shadow-[0_0_0_4px_rgb(var(--accent-rgb)/0.18)]"
            : node.status === "STUDYING"
              ? "border-[1.5px] border-accent"
              : "border border-border";
    const sub = node.hasBoard && node.progress
        ? t("NotebookNodeProgress", { done: node.progress.done, total: node.progress.total, status: t(STATUS_LABEL_KEY[node.status]) })
        : t(STATUS_LABEL_KEY[node.status]);
    return (
        <div
            data-testid="board-node"
            data-status={node.status}
            className={`relative flex items-center gap-2.5 overflow-hidden rounded-xl bg-surface px-3 ${border}`}
            style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
        >
            <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-2 !border-accent !bg-surface" />
            <StatusIcon status={node.status} size={18} />
            <span className="min-w-0 flex-1 leading-[18px]">
                <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-text">
                    {node.icon && <NotebookIcon icon={node.icon} size={13} fallback={null} className="shrink-0" />}
                    <span className="truncate">{node.title}</span>
                </span>
                <span className="flex items-center gap-1 truncate text-xs text-text-2">
                    {node.linked && <Link2 size={11} aria-label={t("NotebookNodeLinked")} />}
                    {node.linked && node.homeTopicTitle ? node.homeTopicTitle : sub}
                </span>
            </span>
            {share > 0 && (
                <span
                    aria-hidden="true"
                    className={`absolute bottom-0 left-0 h-[3px] ${node.status === "DONE" ? "bg-success" : "bg-accent"}`}
                    style={{ width: `${share * 100}%` }}
                />
            )}
            <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-2 !border-accent !bg-surface" />
        </div>
    );
});

/** A labelled band behind nodes. Resizable when selected; opens nothing. */
export const SectionNodeView = memo(function SectionNodeView({ data, selected, id }: NodeProps<SectionFlowNode>) {
    const { node, onResizeEnd } = data;
    return (
        <>
            <NodeResizer
                isVisible={selected}
                minWidth={120}
                minHeight={80}
                lineClassName="!border-accent"
                handleClassName="!h-2.5 !w-2.5 !rounded-sm !border-accent !bg-surface"
                onResizeEnd={(_, size) => onResizeEnd?.(id, size.width, size.height)}
            />
            <div
                data-testid="board-section"
                className="h-full w-full rounded-[18px] border border-dashed border-text-3/40 bg-text/[0.02] p-3"
            >
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-2">{node.title}</span>
            </div>
        </>
    );
});

export const NODE_TYPES = { page: PageNodeView, section: SectionNodeView };
