import { useCallback, useEffect, useState } from "react";

/**
 * How wide the study room's side panels are, and whether each is folded into a thin rail.
 *
 * Desktop only: below the `lg` breakpoint the columns stack and none of this applies. The layout
 * is a per-browser preference, kept in localStorage; a private window or blocked storage just
 * starts from the default every time.
 */
export type StudyLayout = { left: number; right: number; leftCollapsed: boolean; rightCollapsed: boolean };
export type Side = "left" | "right";

export const PANEL_MIN = 220;
export const PANEL_MAX = 560;
/** The width of a folded panel's rail. */
export const RAIL_WIDTH = 52;
export const DEFAULT_LAYOUT: StudyLayout = { left: 300, right: 320, leftCollapsed: false, rightCollapsed: false };

const STORAGE_KEY = "beyou.notebook.studyLayout";

const clamp = (width: number) => Math.min(PANEL_MAX, Math.max(PANEL_MIN, Math.round(width)));

/**
 * The layout after dragging a side's handle `delta` pixels to the right. The left handle sits on
 * the sources panel's right edge, so moving it right widens sources; the right handle sits on the
 * studio's left edge, so moving it right narrows the studio. Dragging a folded panel's handle
 * unfolds it.
 */
export function resized(layout: StudyLayout, side: Side, from: number, delta: number): StudyLayout {
    return side === "left"
        ? { ...layout, left: clamp(from + delta), leftCollapsed: false }
        : { ...layout, right: clamp(from - delta), rightCollapsed: false };
}

export function toggled(layout: StudyLayout, side: Side): StudyLayout {
    return side === "left"
        ? { ...layout, leftCollapsed: !layout.leftCollapsed }
        : { ...layout, rightCollapsed: !layout.rightCollapsed };
}

/** What was stored, if it still makes sense; otherwise the default. */
export function parsed(raw: string | null): StudyLayout {
    try {
        const value = raw ? JSON.parse(raw) : null;
        if (!value || typeof value.left !== "number" || typeof value.right !== "number") return DEFAULT_LAYOUT;
        return {
            left: clamp(value.left),
            right: clamp(value.right),
            leftCollapsed: value.leftCollapsed === true,
            rightCollapsed: value.rightCollapsed === true,
        };
    } catch {
        return DEFAULT_LAYOUT;
    }
}

function read(): StudyLayout {
    try {
        return parsed(window.localStorage.getItem(STORAGE_KEY));
    } catch {
        return DEFAULT_LAYOUT;
    }
}

export function useStudyLayout() {
    const [layout, setLayout] = useState<StudyLayout>(read);

    useEffect(() => {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
        } catch {
            // Storage blocked: the layout lasts as long as the page.
        }
    }, [layout]);

    const resize = useCallback((side: Side, from: number, delta: number) => setLayout((l) => resized(l, side, from, delta)), []);
    const toggle = useCallback((side: Side) => setLayout((l) => toggled(l, side)), []);
    const reset = useCallback((side: Side) => setLayout((l) => ({ ...l, [side]: DEFAULT_LAYOUT[side] })), []);

    return { layout, resize, toggle, reset };
}
