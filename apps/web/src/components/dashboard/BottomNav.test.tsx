import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { screen, within } from "@testing-library/react";
import { tutorialCompletedEnter } from "@beyou/state/user/perfilSlice";
import store from "../../redux/store";
import { renderWithProviders } from "../../test/test-utils";
import ProtectedRoute from "../ProtectedRoute";
import {
    AUTHENTICATED_ROUTES,
    renderAuthenticatedRoute,
    restoreViewport,
    setViewport,
} from "../../test/authenticatedRoutes";

/**
 * The bottom bar is the shortcuts affordance on mobile — it carries
 * `aria-label={t("Shortcuts")}` and the six section entries. It used to be
 * mounted by the dashboard page alone, so on the other authenticated pages the
 * only way to reach another section was the shared `Header`'s
 * return-to-dashboard icon: two navigations for every sideways move.
 *
 * It is now mounted once by the route guard, next to the feedback launcher and
 * the assistant, so these tests exercise the real mount point.
 */
const ITEM_LABELS = ["Categories", "Tasks", "Habits", "Routines", "Goals", "Config"];

beforeEach(() => {
    store.dispatch(tutorialCompletedEnter(true));
    setViewport("mobile");
});

afterEach(() => {
    store.dispatch(tutorialCompletedEnter(false));
    restoreViewport();
});

describe("Bottom nav", () => {
    test.each(AUTHENTICATED_ROUTES)("renders on %s", (route) => {
        renderAuthenticatedRoute(route);

        const nav = screen.getByRole("navigation", { name: "Shortcuts" });
        for (const label of ITEM_LABELS) {
            expect(within(nav).getByRole("link", { name: label })).toBeInTheDocument();
        }
    });

    test.each(AUTHENTICATED_ROUTES)("mounts exactly one bar on %s", (route) => {
        renderAuthenticatedRoute(route);

        expect(screen.getAllByRole("navigation", { name: "Shortcuts" })).toHaveLength(1);
    });

    test("is global behind the gate, and only behind the gate", () => {
        // The bar links to six signed-in destinations, so it must not survive a
        // signed-out render. Mounting it in `ProtectedRoute` is what guarantees
        // that: the gate redirects before it renders any chrome.
        renderWithProviders(
            <Routes>
                <Route path="/" element={<p>login</p>} />
                <Route element={<ProtectedRoute authState="unauthenticated" />}>
                    <Route path="/habits" element={<p>habits</p>} />
                </Route>
            </Routes>,
            { route: "/" }
        );

        expect(screen.queryByRole("navigation", { name: "Shortcuts" })).not.toBeInTheDocument();
        expect(screen.queryByTestId("bottom-nav-spacer")).not.toBeInTheDocument();
    });

    test("carries six items and no feedback entry of its own", () => {
        renderAuthenticatedRoute("/habits");

        const nav = screen.getByRole("navigation", { name: "Shortcuts" });
        expect(within(nav).getAllByRole("link")).toHaveLength(6);
        expect(within(nav).queryByRole("link", { name: "FeedbackNavLabel" })).toBeNull();
    });

    /**
     * Desktop keeps the labelled `Shortcuts` sidebar on the dashboard, so the
     * bar is a mobile-only affordance.
     *
     * This one assertion reads a class rather than rendered behaviour, and it is
     * the only one in this file that does: the bar is hidden by Tailwind's
     * `lg:hidden`, and jsdom applies no stylesheets and evaluates no `@media`
     * blocks, so there is no computed style to assert against. See the note on
     * `setViewport` in `test/authenticatedRoutes.tsx`.
     */
    test.each(AUTHENTICATED_ROUTES)("is hidden from the lg breakpoint up on %s", (route) => {
        renderAuthenticatedRoute(route);

        const nav = screen.getByRole("navigation", { name: "Shortcuts" });
        expect(nav.className.split(/\s+/)).toContain("lg:hidden");
    });
});

/**
 * The bar is `fixed`, so it sits on top of the page instead of pushing it: the
 * last element of every page needs clearance underneath it or the bar covers it.
 * The dashboard used to ship its own spacer. Now that the bar follows the user
 * everywhere, the spacer travels with it — one at the mount point, not seven.
 */
describe("Bottom nav clearance", () => {
    test.each(AUTHENTICATED_ROUTES)("exists on %s", (route) => {
        renderAuthenticatedRoute(route);

        expect(screen.getByTestId("bottom-nav-spacer")).toBeInTheDocument();
    });

    test.each(AUTHENTICATED_ROUTES)("is not doubled on %s", (route) => {
        renderAuthenticatedRoute(route);

        // /dashboard is the one that matters: it carried its own spacer before
        // the bar became global, and a leftover would double the gap there.
        expect(screen.getAllByTestId("bottom-nav-spacer")).toHaveLength(1);
    });

    test("is inert to assistive tech — it is blank space, not content", () => {
        renderAuthenticatedRoute("/routines");

        expect(screen.getByTestId("bottom-nav-spacer")).toHaveAttribute("aria-hidden", "true");
    });
});

/**
 * The filled-primary treatment answers "where am I?", so exactly one item may
 * carry it — the one matching the current route. It used to be a static flag on
 * Habits + Routines, which meant the bar showed the same two items filled no
 * matter where you were: decoration, not orientation.
 *
 * `aria-current="page"` is the anchor here rather than a class string. It is
 * what a screen reader announces, `NavLink` sets it from the same match that
 * drives the colour, and it survives restyling. One test then pins the colour to
 * it, so the two can't drift apart.
 */
const ACTIVE_ITEM_BY_ROUTE: ReadonlyArray<readonly [string, string | null]> = [
    ["/categories", "Categories"],
    ["/tasks", "Tasks"],
    ["/habits", "Habits"],
    ["/routines", "Routines"],
    ["/goals", "Goals"],
    ["/configuration", "Config"],
    // Neither has an entry in the bar, so nothing is highlighted.
    ["/dashboard", null],
    ["/feedback", null],
];

describe("Bottom nav active item", () => {
    test.each(ACTIVE_ITEM_BY_ROUTE)("on %s highlights %s", (route, expected) => {
        renderAuthenticatedRoute(route);

        const nav = screen.getByRole("navigation", { name: "Shortcuts" });
        const highlighted = ITEM_LABELS.filter(
            (label) =>
                within(nav).getByRole("link", { name: label }).getAttribute("aria-current") ===
                "page"
        );

        expect(highlighted).toEqual(expected === null ? [] : [expected]);
    });

    test("fills the current item and leaves the rest unfilled", () => {
        renderAuthenticatedRoute("/goals");

        const nav = screen.getByRole("navigation", { name: "Shortcuts" });
        for (const label of ITEM_LABELS) {
            const link = within(nav).getByRole("link", { name: label });
            // Pins the colour to the semantics: whatever marks the current page
            // for assistive tech is what gets the primary fill, and only that.
            // `classList` and not a substring match — every inactive item
            // carries `hover:bg-primary/10`, which contains "bg-primary".
            expect(link.classList.contains("bg-primary")).toBe(label === "Goals");
        }
    });

    test("keeps a nested path on its section", () => {
        // A future detail route (/routines/:id) must still light Routines —
        // exact-equality matching would silently blank the bar there.
        renderAuthenticatedRoute("/routines");

        const nav = screen.getByRole("navigation", { name: "Shortcuts" });
        expect(within(nav).getByRole("link", { name: "Routines" })).toHaveAttribute(
            "aria-current",
            "page"
        );
    });
});
