import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { screen } from "@testing-library/react";
import { tutorialCompletedEnter } from "@beyou/state/user/perfilSlice";
import { renderWithProviders } from "../../test/test-utils";
import store from "../../redux/store";
import ProtectedRoute from "../ProtectedRoute";

/**
 * #10. Feedback was reachable from exactly one of the seven authenticated web
 * pages — the dashboard, via its shortcut grid. On categories, habits, goals,
 * tasks, routines or configuration the user had to navigate back to the
 * dashboard first, because the shared `Header` those pages render is a title,
 * an optional logout and a return-to-dashboard icon.
 *
 * The launcher is mounted once inside `ProtectedRoute`, so these tests exercise
 * the real mount point rather than the component in isolation: the claim being
 * pinned is "reachable from any authenticated page", not "this component
 * renders a link".
 *
 * The dashboard is deliberately NOT in this list: it already carries the
 * labelled shortcut in its sidebar, and that is the discoverable entry. Two
 * controls for one action on one screen is clutter, so the launcher steps aside
 * there — the same way it does on the feedback form itself.
 */
const ROUTES_WITHOUT_THEIR_OWN_ENTRY = [
    "/categories",
    "/habits",
    "/goals",
    "/tasks",
    "/routines",
    "/configuration"
];

const renderAt = (route: string) =>
    renderWithProviders(
        <Routes>
            <Route element={<ProtectedRoute authState="authenticated" />}>
                <Route path="/dashboard" element={<p>dashboard</p>} />
                <Route path="/categories" element={<p>categories</p>} />
                <Route path="/habits" element={<p>habits</p>} />
                <Route path="/goals" element={<p>goals</p>} />
                <Route path="/tasks" element={<p>tasks</p>} />
                <Route path="/routines" element={<p>routines</p>} />
                <Route path="/configuration" element={<p>configuration</p>} />
                <Route path="/feedback" element={<p>feedback</p>} />
            </Route>
        </Routes>,
        { route }
    );

beforeEach(() => {
    store.dispatch(tutorialCompletedEnter(true));
});

afterEach(() => {
    store.dispatch(tutorialCompletedEnter(false));
});

describe("Feedback launcher", () => {
    test.each(ROUTES_WITHOUT_THEIR_OWN_ENTRY)("is reachable from %s", (route) => {
        renderAt(route);

        const launcher = screen.getByTestId("feedback-fab");
        expect(launcher).toBeInTheDocument();
        expect(launcher).toHaveAttribute("href", "/feedback");
    });

    test("stays out of the header — the shared Header keeps title and return only", () => {
        renderAt("/habits");

        // The launcher is a fixed overlay mounted by the route guard, not a
        // child of any page's header.
        expect(screen.getByTestId("feedback-fab").closest("header")).toBeNull();
    });

    test("steps aside on the feedback screen itself", () => {
        renderAt("/feedback");

        expect(screen.queryByTestId("feedback-fab")).not.toBeInTheDocument();
    });

    test("stays mounted on the dashboard, hidden only where the shortcut shows", () => {
        renderAt("/dashboard");

        // The Shortcuts sidebar that carries the labelled entry is `hidden
        // lg:flex`, so on a narrow viewport it does not exist — and the
        // dashboard has no shared Header and no feedback item in BottomNav.
        // Removing the launcher by route left that width with no way in at all.
        const launcher = screen.getByTestId("feedback-fab");
        expect(launcher).toBeInTheDocument();
        expect(launcher.className).toContain("lg:hidden");
    });

    test("carries no hide class on a route that has no shortcut of its own", () => {
        renderAt("/habits");

        expect(screen.getByTestId("feedback-fab").className).not.toContain("lg:hidden");
    });

    test("stays hidden during onboarding, like the assistant", () => {
        store.dispatch(tutorialCompletedEnter(false));

        renderAt("/habits");

        expect(screen.queryByTestId("feedback-fab")).not.toBeInTheDocument();
    });
});
