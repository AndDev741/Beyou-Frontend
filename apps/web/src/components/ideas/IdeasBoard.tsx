import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import {
    Background,
    BackgroundVariant,
    Controls,
    ReactFlow,
    applyNodeChanges,
    useReactFlow,
    type Node,
    type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./ideas.css";
import { noteColors } from "@beyou/state";
import {
    QUICK_NOTE_HEIGHT,
    QUICK_NOTE_WIDTH,
    type QuickNote,
} from "@beyou/types/quickNote/quickNote";
import { useTheme } from "../../context/ThemeContext";
import { NOTE_TYPES, type DraftNote, type NoteActions, type StickyFlowNode } from "./StickyNoteNode";
import { prefersReducedMotion } from "./quickCapture";

/** The draft's node id. Never a server id, so it can never collide with a note. */
export const DRAFT_NODE_ID = "quick-note-draft";

/** How long arrow-key nudges wait before they are saved, so a run of presses is one save. */
const KEYBOARD_SAVE_DELAY_MS = 400;

/** "Show all": every note in view with a margin, never zoomed in past life size. */
export const FIT_OPTIONS = { padding: 0.15, maxZoom: 1 } as const;

export type NoteMove = { id: string; x: number; y: number };

export type IdeasBoardProps = {
    /** Back to front, as the store keeps them. */
    notes: QuickNote[];
    editingId: string | null;
    draft: DraftNote | null;
    actions: NoteActions;
    /** Where notes were dropped (top-left corners, board units). */
    onMove: (moves: NoteMove[]) => void;
    /** A double-click on an empty spot, as the top-left corner a note centred there would have. */
    onCreateAt: (at: { x: number; y: number }) => void;
    /**
     * Bumped with a store change to frame the board once that change is drawn (the first load, a
     * tidy). The Show all button needs no new nodes and calls `fitView` itself.
     */
    fitSignal: number;
    ariaLabel: string;
};

/** A screen reader reads the note by its text; the label stays short for a long one. */
function labelText(text: string): string {
    const flat = text.replace(/\s+/g, " ").trim();
    return flat.length > 140 ? `${flat.slice(0, 139)}…` : flat;
}

/**
 * The Ideas board, drawn with React Flow. Must sit inside a `ReactFlowProvider` (the page owns
 * it, so the capture bar can pan to a new note).
 *
 * The store is the truth. This keeps a local copy of the nodes only so a drag moves smoothly
 * before it is saved, and re-reads the store whenever it changes, keeping what was selected.
 * Notes draw in the store's order, back to front, so the last one dropped sits on top.
 *
 * Moves are saved two ways: a drag on drop, and arrow-key nudges on a keyboard-focused note a
 * moment after the last press. React Flow reports both as position changes; the ones that come
 * while a drag is running belong to the drag and are saved on its drop.
 */
export default function IdeasBoard({
    notes,
    editingId,
    draft,
    actions,
    onMove,
    onCreateAt,
    fitSignal,
    ariaLabel,
}: IdeasBoardProps) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const { fitView, screenToFlowPosition } = useReactFlow();
    const palette = useMemo(() => noteColors(theme.base), [theme.base]);

    const toFlow = useCallback((): StickyFlowNode[] => {
        const flow: StickyFlowNode[] = notes.map((note) => ({
            id: note.id,
            type: "stickyNote",
            position: { x: note.x, y: note.y },
            // Fixed size: the server places and tidies notes at exactly this size, and a node
            // with its size known draws (and fits) before React Flow has measured it.
            width: QUICK_NOTE_WIDTH,
            height: QUICK_NOTE_HEIGHT,
            draggable: note.id !== editingId,
            ariaLabel: t("IdeasNoteLabel", { text: labelText(note.text) }),
            data: {
                note,
                paint: palette[note.color],
                palette,
                editing: note.id === editingId,
                actions,
            },
        }));
        if (draft) {
            flow.push({
                id: DRAFT_NODE_ID,
                type: "stickyNote",
                position: { x: draft.x, y: draft.y },
                width: QUICK_NOTE_WIDTH,
                height: QUICK_NOTE_HEIGHT,
                draggable: false,
                selectable: false,
                ariaLabel: t("IdeasCaptureLabel"),
                data: {
                    note: null,
                    draft,
                    paint: palette[draft.color],
                    palette,
                    editing: draft.savingText === null,
                    actions,
                },
            });
        }
        return flow;
    }, [notes, editingId, draft, palette, actions, t]);

    const [nodes, setNodes] = useState<StickyFlowNode[]>(toFlow);
    useEffect(() => {
        setNodes((current) => {
            const selected = new Set(current.filter((n) => n.selected).map((n) => n.id));
            return toFlow().map((n) => (selected.has(n.id) ? { ...n, selected: true } : n));
        });
    }, [toFlow]);

    const onMoveRef = useRef(onMove);
    onMoveRef.current = onMove;
    const dragging = useRef(false);
    const nudged = useRef(new Map<string, { x: number; y: number }>());
    const nudgeTimer = useRef<number | undefined>(undefined);

    useEffect(() => () => window.clearTimeout(nudgeTimer.current), []);

    // Removals are never applied here: a note leaves the board when the store says it has.
    const onNodesChange = useCallback((changes: NodeChange<StickyFlowNode>[]) => {
        setNodes((current) => applyNodeChanges(changes.filter((c) => c.type !== "remove"), current));
        if (dragging.current) return;
        let any = false;
        for (const change of changes) {
            if (change.type === "position" && change.position && !change.dragging && change.id !== DRAFT_NODE_ID) {
                nudged.current.set(change.id, change.position);
                any = true;
            }
        }
        if (!any) return;
        window.clearTimeout(nudgeTimer.current);
        nudgeTimer.current = window.setTimeout(() => {
            const moves = [...nudged.current].map(([id, at]) => ({ id, x: at.x, y: at.y }));
            nudged.current.clear();
            if (moves.length) onMoveRef.current(moves);
        }, KEYBOARD_SAVE_DELAY_MS);
    }, []);

    const startDrag = useCallback(() => {
        dragging.current = true;
    }, []);

    const stopDrag = useCallback((dragged: Node[]) => {
        dragging.current = false;
        const moves = dragged
            .filter((n) => n.id !== DRAFT_NODE_ID)
            .map((n) => ({ id: n.id, x: n.position.x, y: n.position.y }));
        if (moves.length) onMoveRef.current(moves);
    }, []);

    // The fit waits for the nodes it was asked about. The store's answer reaches `nodes` one
    // render after the signal (through the effect above), and fitting any sooner would frame the
    // layout from before the tidy.
    const pendingFit = useRef(false);
    useEffect(() => {
        if (fitSignal > 0) pendingFit.current = true;
    }, [fitSignal]);
    useEffect(() => {
        if (!pendingFit.current) return;
        pendingFit.current = false;
        void fitView({ ...FIT_OPTIONS, duration: prefersReducedMotion() ? 0 : 300 });
    }, [nodes, fitView]);

    const onDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
        // Only the empty board: a double-click on a note edits it (onNodeDoubleClick).
        const target = event.target as Element;
        if (!target.classList?.contains("react-flow__pane")) return;
        const at = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        onCreateAt({ x: at.x - QUICK_NOTE_WIDTH / 2, y: at.y - QUICK_NOTE_HEIGHT / 2 });
    };

    // Enter on a focused note edits it. React Flow selects it on the same key first.
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== "Enter" || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        const target = event.target as HTMLElement;
        if (!target.classList?.contains("react-flow__node")) return;
        const id = target.dataset.id;
        if (id && id !== DRAFT_NODE_ID) {
            event.preventDefault();
            actions.startEdit(id);
        }
    };

    return (
        <div className="beyou-ideas h-full w-full" onDoubleClick={onDoubleClick} onKeyDown={onKeyDown}>
            <ReactFlow<StickyFlowNode>
                aria-label={ariaLabel}
                nodes={nodes}
                edges={[]}
                nodeTypes={NOTE_TYPES}
                onNodesChange={onNodesChange}
                onNodeDragStart={startDrag}
                onNodeDragStop={(_, __, dragged) => stopDrag(dragged)}
                onSelectionDragStart={startDrag}
                onSelectionDragStop={(_, dragged) => stopDrag(dragged)}
                onNodeDoubleClick={(_, node) => {
                    if (node.id !== DRAFT_NODE_ID) actions.startEdit(node.id);
                }}
                nodesConnectable={false}
                deleteKeyCode={null}
                zoomOnDoubleClick={false}
                // A margin, so the first note (the server puts it at 0,0) is not flush with the edge.
                defaultViewport={{ x: 24, y: 24, zoom: 1 }}
                minZoom={0.2}
                maxZoom={1.75}
                proOptions={{ hideAttribution: true }}
            >
                <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} />
                {/* Bottom left: the assistant's bubble floats bottom right on desktop. */}
                <Controls showInteractive={false} showFitView={false} position="bottom-left" />
            </ReactFlow>
        </div>
    );
}
