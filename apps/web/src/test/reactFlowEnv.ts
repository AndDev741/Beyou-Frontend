import { act } from "@testing-library/react";

/**
 * What React Flow needs to run in jsdom, for suites that draw a real board.
 *
 * jsdom has no ResizeObserver, which React Flow creates on mount; a no-op one is enough when the
 * nodes carry a fixed width and height, as the Ideas board's notes do. Installed on import.
 */
class NoopResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}

if (!("ResizeObserver" in globalThis)) {
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = NoopResizeObserver;
}

/**
 * A mouse drag React Flow believes: d3-drag reads `event.view` to listen for the moves on the
 * window, and the events `fireEvent` builds under vitest carry no view it accepts. The positions
 * are screen pixels.
 */
export function dragNode(node: Element, from: { x: number; y: number }, to: { x: number; y: number }) {
    const mouse = (type: string, at: { x: number; y: number }) => {
        const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: at.x, clientY: at.y, button: 0 });
        Object.defineProperty(event, "view", { value: window });
        return event;
    };
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    act(() => {
        node.dispatchEvent(mouse("mousedown", from));
    });
    act(() => {
        window.dispatchEvent(mouse("mousemove", mid));
    });
    act(() => {
        window.dispatchEvent(mouse("mousemove", to));
    });
    act(() => {
        window.dispatchEvent(mouse("mouseup", to));
    });
}
