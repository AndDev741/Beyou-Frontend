import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { DEFAULT_LAYOUT, PANEL_MAX, PANEL_MIN, parsed, resized, toggled } from "../studyLayout";
import { ResizeHandle } from "../StudyColumns";

describe("study room layout", () => {
    /** The left bar is on the sources panel's right edge; the right bar on the studio's left edge. */
    test("dragging right widens sources and narrows the studio", () => {
        expect(resized(DEFAULT_LAYOUT, "left", 300, 120).left).toBe(420);
        // 320 - 120 = 200, under the minimum.
        expect(resized(DEFAULT_LAYOUT, "right", 320, 120).right).toBe(PANEL_MIN);
        expect(resized(DEFAULT_LAYOUT, "right", 320, -100).right).toBe(420);
    });

    test("a panel never goes below or above its limits", () => {
        expect(resized(DEFAULT_LAYOUT, "left", 300, -500).left).toBe(PANEL_MIN);
        expect(resized(DEFAULT_LAYOUT, "left", 300, 900).left).toBe(PANEL_MAX);
    });

    /** Folding keeps the width, so unfolding comes back to it; dragging a folded panel unfolds it. */
    test("folding keeps the width and a drag unfolds", () => {
        const folded = toggled(DEFAULT_LAYOUT, "right");
        expect(folded).toMatchObject({ rightCollapsed: true, right: DEFAULT_LAYOUT.right });
        expect(resized(folded, "right", folded.right, -40)).toMatchObject({ rightCollapsed: false, right: 360 });
    });

    test("what was stored is kept only if it makes sense", () => {
        expect(parsed(JSON.stringify({ left: 410, right: 2000, leftCollapsed: true, rightCollapsed: "yes" })))
            .toEqual({ left: 410, right: PANEL_MAX, leftCollapsed: true, rightCollapsed: false });
        expect(parsed("not json")).toEqual(DEFAULT_LAYOUT);
        expect(parsed(null)).toEqual(DEFAULT_LAYOUT);
        expect(parsed(JSON.stringify({ left: "wide" }))).toEqual(DEFAULT_LAYOUT);
    });

    test("the bar answers the keyboard and a double click", () => {
        const onResize = vi.fn();
        const onReset = vi.fn();
        const onToggle = vi.fn();
        render(<ResizeHandle side="left" width={300} label="Resize" onResize={onResize} onReset={onReset} onToggle={onToggle} />);
        const bar = screen.getByRole("separator", { name: "Resize" });

        fireEvent.keyDown(bar, { key: "ArrowRight" });
        fireEvent.keyDown(bar, { key: "ArrowLeft", shiftKey: true });
        fireEvent.keyDown(bar, { key: "Enter" });
        fireEvent.doubleClick(bar);

        expect(onResize).toHaveBeenNthCalledWith(1, 300, 16);
        expect(onResize).toHaveBeenNthCalledWith(2, 300, -64);
        expect(onToggle).toHaveBeenCalledTimes(1);
        expect(onReset).toHaveBeenCalledTimes(1);
        expect(bar).toHaveAttribute("aria-valuenow", "300");
    });
});
