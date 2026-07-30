import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import { renderWithProviders } from "./test-utils";

/**
 * Every route behind the signed-in gate, i.e. every route nested under
 * `<ProtectedRoute>` in `App.tsx`. Global chrome (the bottom bar, the feedback
 * launcher, the assistant) is mounted by the gate, so a claim about "every
 * authenticated page" has to be exercised against this list — not against one
 * page that happens to render the component.
 */
export const AUTHENTICATED_ROUTES = [
    "/dashboard",
    "/categories",
    "/habits",
    "/goals",
    "/tasks",
    "/routines",
    "/configuration",
    "/feedback",
] as const;

/**
 * Renders the real gate with stand-in pages, so tests exercise the actual mount
 * point rather than a component in isolation.
 */
export function renderAuthenticatedRoute(route: string) {
    return renderWithProviders(
        <Routes>
            <Route element={<ProtectedRoute authState="authenticated" />}>
                {AUTHENTICATED_ROUTES.map((path) => (
                    <Route key={path} path={path} element={<p>{path.slice(1)}</p>} />
                ))}
            </Route>
        </Routes>,
        { route }
    );
}

/** Tailwind's `lg` breakpoint is 1100px (see `tailwind.config.js`). */
const DESKTOP_WIDTH = 1400;
const MOBILE_WIDTH = 390;

let originalMatchMedia: typeof window.matchMedia;
let originalInnerWidth: number;

/**
 * Drives the `matchMedia` the app actually reads, so width-dependent UI can be
 * asserted by WHAT RENDERS rather than by the shape of a class string.
 *
 * This is needed because jsdom does not evaluate media queries: its `matchMedia`
 * always reports `matches: false` regardless of `window.innerWidth`, and
 * `getComputedStyle` ignores `@media` blocks entirely (both verified against the
 * jsdom this project pins). Anything hidden purely by a Tailwind responsive
 * class is therefore invisible to assertions; anything decided in JS is not.
 */
export function setViewport(size: "mobile" | "desktop") {
    const width = size === "desktop" ? DESKTOP_WIDTH : MOBILE_WIDTH;
    if (originalMatchMedia === undefined) {
        originalMatchMedia = window.matchMedia;
        originalInnerWidth = window.innerWidth;
    }
    window.innerWidth = width;
    window.matchMedia = ((query: string) => {
        const minWidth = /\(min-width:\s*(\d+)px\)/.exec(query);
        return {
            matches: minWidth ? width >= Number(minWidth[1]) : false,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
        } as unknown as MediaQueryList;
    }) as typeof window.matchMedia;
}

export function restoreViewport() {
    if (originalMatchMedia !== undefined) {
        window.matchMedia = originalMatchMedia;
        window.innerWidth = originalInnerWidth;
        originalMatchMedia = undefined as unknown as typeof window.matchMedia;
    }
}
