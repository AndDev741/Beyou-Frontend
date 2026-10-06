import { useRef } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { PanelLeftOpen, PanelRightOpen } from "lucide-react";
import { PANEL_MAX, PANEL_MIN, type Side } from "./studyLayout";

/**
 * The bar between the chat and a side panel. Drag it to resize the panel, double-click it to go
 * back to the default width, or use the arrow keys (Shift for bigger steps) and Enter to fold or
 * unfold the panel. Desktop only, like the layout it changes.
 */
export function ResizeHandle({ side, width, label, onResize, onReset, onToggle }: {
    side: Side;
    width: number;
    label: string;
    /** Resize from `from` pixels wide by `delta` pixels of pointer movement to the right. */
    onResize: (from: number, delta: number) => void;
    onReset: () => void;
    onToggle: () => void;
}) {
    const drag = useRef<{ x: number; width: number } | null>(null);

    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { x: event.clientX, width };
    };
    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        if (!drag.current) return;
        onResize(drag.current.width, event.clientX - drag.current.x);
    };
    const onPointerUp = () => {
        drag.current = null;
    };
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const step = event.shiftKey ? 64 : 16;
        if (event.key === "ArrowLeft") onResize(width, -step);
        else if (event.key === "ArrowRight") onResize(width, step);
        else if (event.key === "Enter") onToggle();
        else return;
        event.preventDefault();
    };

    return (
        <div
            role="separator"
            aria-orientation="vertical"
            aria-label={label}
            aria-valuenow={width}
            aria-valuemin={PANEL_MIN}
            aria-valuemax={PANEL_MAX}
            tabIndex={0}
            data-testid={`study-resize-${side}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onDoubleClick={onReset}
            onKeyDown={onKeyDown}
            className="group hidden w-4 shrink-0 cursor-col-resize touch-none select-none justify-center outline-none lg:flex"
        >
            <span className="my-3 w-1 rounded-full transition-colors group-hover:bg-border group-focus-visible:bg-accent" />
        </div>
    );
}

/** A folded side panel: a thin column with its name, which unfolds it. */
export function PanelRail({ side, label, expandLabel, count, onExpand }: {
    side: Side;
    label: string;
    expandLabel: string;
    count?: number;
    onExpand: () => void;
}) {
    const Icon = side === "left" ? PanelLeftOpen : PanelRightOpen;
    return (
        <button
            type="button"
            onClick={onExpand}
            aria-label={expandLabel}
            title={expandLabel}
            data-testid={`study-rail-${side}`}
            className="hidden min-h-[220px] w-full flex-col items-center gap-3 rounded-card border border-border bg-surface py-3 text-text-2 hover:text-text lg:flex"
        >
            <Icon size={18} aria-hidden="true" />
            <span className="text-[13px] font-semibold [writing-mode:vertical-rl]">{label}</span>
            {count !== undefined && count > 0 && <span className="font-mono text-[11px]">{count}</span>}
        </button>
    );
}
