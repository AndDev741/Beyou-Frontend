import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Background,
    BackgroundVariant,
    Controls,
    MarkerType,
    MiniMap,
    ReactFlow,
    ReactFlowProvider,
    applyNodeChanges,
    type Connection,
    type Edge,
    type Node,
    type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./board.css";
import type { Board, BoardNode } from "@beyou/types/notebook/notebook";
import { NODE_TYPES, type PageNodeData } from "./BoardNodes";

export type RoadmapBoardProps = {
    board: Board;
    /** Inline sits inside a page and must not steal the page's scroll; focus is the whole screen. */
    mode: "inline" | "focus";
    selectedNodeId?: string | null;
    onSelect?: (node: BoardNode | null) => void;
    onOpenPage?: (pageId: string) => void;
    /** Positions after a drag, to save. */
    onMove?: (positions: { nodeId: string; x: number; y: number }[]) => void;
    onResizeSection?: (nodeId: string, width: number, height: number) => void;
    onConnect?: (source: string, target: string) => void;
    onDeleteEdge?: (edgeId: string) => void;
    onDeleteNode?: (node: BoardNode) => void;
    readOnly?: boolean;
    ariaLabel: string;
};

/**
 * A page's roadmap, drawn with React Flow.
 *
 * The board in the store is the truth; this component keeps a local copy of node positions only
 * so a drag can move smoothly before it is saved, and re-reads the board whenever it changes.
 * Sections are drawn first and below, so a band never covers the nodes on it.
 *
 * Inline, scrolling the wheel scrolls the PAGE, as it would anywhere else in a document; zooming
 * takes a pinch or Ctrl and the wheel. In focus mode the wheel zooms, as a canvas should.
 */
export default function RoadmapBoard(props: RoadmapBoardProps) {
    return (
        <ReactFlowProvider>
            <BoardCanvas {...props} />
        </ReactFlowProvider>
    );
}

function BoardCanvas({
    board,
    mode,
    selectedNodeId,
    onSelect,
    onOpenPage,
    onMove,
    onResizeSection,
    onConnect,
    onDeleteEdge,
    onDeleteNode,
    readOnly = false,
    ariaLabel,
}: RoadmapBoardProps) {
    const toFlow = useCallback(
        (): Node<PageNodeData>[] =>
            [...board.nodes]
                .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "SECTION" ? -1 : 1))
                .map((node) => ({
                    id: node.id,
                    type: node.kind === "SECTION" ? "section" : "page",
                    position: { x: node.x, y: node.y },
                    data: { node, onResizeEnd: onResizeSection },
                    selected: node.id === selectedNodeId,
                    zIndex: node.kind === "SECTION" ? -1 : 1,
                    ...(node.kind === "SECTION"
                        ? { style: { width: node.width ?? 420, height: node.height ?? 260 } }
                        : {}),
                })),
        [board.nodes, onResizeSection, selectedNodeId]
    );
    const [nodes, setNodes] = useState<Node<PageNodeData>[]>(toFlow);
    useEffect(() => setNodes(toFlow()), [toFlow]);

    const statusOf = useMemo(() => new Map(board.nodes.map((n) => [n.id, n.status])), [board.nodes]);
    const edges: Edge[] = useMemo(
        () =>
            board.edges.map((edge) => {
                // An edge out of something started or finished is the way the person has come.
                const walked = statusOf.get(edge.source) && statusOf.get(edge.source) !== "TO_STUDY";
                const colour = walked ? "rgb(var(--accent-rgb))" : "rgb(var(--text-3-rgb) / 0.55)";
                return {
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    type: "smoothstep",
                    style: { stroke: colour, strokeWidth: 2 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: colour, width: 16, height: 16 },
                    deletable: !readOnly,
                };
            }),
        [board.edges, statusOf, readOnly]
    );

    // Removals are never applied locally: a node leaves the board when the server says it has,
    // through the store. Applying them here would make a Delete press look done before it is.
    const onNodesChange = useCallback((changes: NodeChange<Node<PageNodeData>>[]) => {
        setNodes((current) => applyNodeChanges(changes.filter((c) => c.type !== "remove"), current));
    }, []);

    const byId = useMemo(() => new Map(board.nodes.map((n) => [n.id, n])), [board.nodes]);

    return (
        <div className={`beyou-board h-full w-full ${mode === "inline" ? "beyou-board-inline" : ""}`} aria-label={ariaLabel} role="figure">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={NODE_TYPES}
                onNodesChange={onNodesChange}
                onNodeDragStop={(_, __, dragged) =>
                    onMove?.(dragged.map((n) => ({ nodeId: n.id, x: Math.round(n.position.x), y: Math.round(n.position.y) })))
                }
                onNodeClick={(_, node) => onSelect?.(byId.get(node.id) ?? null)}
                onNodeDoubleClick={(_, node) => {
                    const pageId = byId.get(node.id)?.pageId;
                    if (pageId) onOpenPage?.(pageId);
                }}
                onPaneClick={() => onSelect?.(null)}
                onConnect={(connection: Connection) => {
                    if (connection.source && connection.target && connection.source !== connection.target) {
                        onConnect?.(connection.source, connection.target);
                    }
                }}
                onEdgesDelete={(deleted) => deleted.forEach((e) => onDeleteEdge?.(e.id))}
                onNodesDelete={(deleted) => deleted.forEach((n) => {
                    const node = byId.get(n.id);
                    if (node) onDeleteNode?.(node);
                })}
                nodesDraggable={!readOnly}
                nodesConnectable={!readOnly}
                elementsSelectable
                // Keyboard deletion only where there is somewhere to confirm it (focus mode).
                deleteKeyCode={readOnly || !onDeleteNode ? null : ["Backspace", "Delete"]}
                fitView
                fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
                minZoom={0.25}
                maxZoom={1.75}
                zoomOnScroll={mode === "focus"}
                panOnScroll={false}
                preventScrolling={mode === "focus"}
                zoomOnDoubleClick={false}
                proOptions={{ hideAttribution: true }}
            >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} />
                <Controls showInteractive={false} position="bottom-right" />
                {mode === "focus" && <MiniMap pannable zoomable position="bottom-left" />}
            </ReactFlow>
        </div>
    );
}
