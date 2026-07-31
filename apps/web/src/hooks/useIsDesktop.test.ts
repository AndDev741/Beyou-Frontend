import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { LG_BREAKPOINT_PX, useIsDesktop } from "./useIsDesktop";

/**
 * This hook decides whether the feedback launcher EXISTS in the DOM on every
 * route that is not /dashboard, /configuration or /feedback — it is not
 * styling. So its dynamic behaviour is tested here directly, rather than only
 * through its consumers: a listener that never fires, or a wrong value on first
 * paint, would strand the bubble at the wrong widths while the component-level
 * suites (which pin the viewport before mounting) stayed green.
 *
 * jsdom cannot help — its `matchMedia` reports `matches: false` for every query
 * regardless of `window.innerWidth`, and never emits `change`. The fake below is
 * therefore the whole environment for the subject under test: it evaluates
 * `(min-width: Npx)` for real and lets a test drive a resize.
 */
type ChangeListener = (event: MediaQueryListEvent) => void;

function installMatchMedia(initialWidth: number) {
    let width = initialWidth;
    // Every matchMedia() call returns a fresh object, as in a browser, but they
    // share one listener set so a resize reaches whichever one the hook kept.
    const listeners = new Set<ChangeListener>();

    const evaluate = (query: string): boolean => {
        const minWidth = /\(min-width:\s*(\d+)px\)/.exec(query);
        return minWidth ? width >= Number(minWidth[1]) : false;
    };

    window.matchMedia = ((query: string) =>
        ({
            get matches() {
                return evaluate(query);
            },
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: (_type: string, listener: ChangeListener) => {
                listeners.add(listener);
            },
            removeEventListener: (_type: string, listener: ChangeListener) => {
                listeners.delete(listener);
            },
            dispatchEvent: () => false,
        }) as unknown as MediaQueryList) as typeof window.matchMedia;

    const query = `(min-width: ${LG_BREAKPOINT_PX}px)`;

    return {
        resizeTo(nextWidth: number) {
            width = nextWidth;
            const event = { matches: evaluate(query), media: query } as MediaQueryListEvent;
            for (const listener of [...listeners]) listener(event);
        },
        get subscriberCount(): number {
            return listeners.size;
        },
    };
}

const originalMatchMedia = window.matchMedia;

afterEach(() => {
    window.matchMedia = originalMatchMedia;
});

describe("useIsDesktop", () => {
    test("reports mobile below the lg breakpoint", () => {
        installMatchMedia(LG_BREAKPOINT_PX - 1);

        const { result } = renderHook(() => useIsDesktop());

        expect(result.current).toBe(false);
    });

    test("reports desktop at the lg breakpoint exactly", () => {
        // The boundary itself is desktop: `lg:` variants apply at min-width.
        installMatchMedia(LG_BREAKPOINT_PX);

        const { result } = renderHook(() => useIsDesktop());

        expect(result.current).toBe(true);
    });

    test("follows the viewport across the breakpoint in both directions", () => {
        const viewport = installMatchMedia(390);

        const { result } = renderHook(() => useIsDesktop());
        expect(result.current).toBe(false);

        // A window resize or a tablet rotation — not a remount.
        act(() => viewport.resizeTo(1400));
        expect(result.current).toBe(true);

        act(() => viewport.resizeTo(800));
        expect(result.current).toBe(false);
    });

    test("unsubscribes on unmount", () => {
        const viewport = installMatchMedia(390);

        const { unmount } = renderHook(() => useIsDesktop());
        expect(viewport.subscriberCount).toBe(1);

        unmount();

        // A leaked listener would set state on an unmounted component every
        // time the window resized, for the life of the tab.
        expect(viewport.subscriberCount).toBe(0);
    });
});

/**
 * The hook decides "is this a desktop width?" in JS while the rest of the app
 * decides it in CSS via `lg:` variants. Both have to mean the same width, or
 * chrome gated by the hook and chrome gated by a class disagree in the band
 * between the two values — the failure mode is a feedback bubble and a bottom
 * bar both on screen, or neither.
 *
 * Tailwind's config is CommonJS in an ESM package, so it is read as text rather
 * than imported.
 */
test("matches the lg breakpoint declared in tailwind.config.js", () => {
    // Vitest runs with the app root as cwd.
    const config = readFileSync(resolve(process.cwd(), "tailwind.config.js"), "utf8");

    const declared = /\blg:\s*"(\d+)px"/.exec(config);

    expect(declared, "tailwind.config.js no longer declares an `lg` screen").not.toBeNull();
    expect(Number(declared![1])).toBe(LG_BREAKPOINT_PX);
});
