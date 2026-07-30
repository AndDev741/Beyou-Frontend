import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { screen } from "@testing-library/react";
import { tutorialCompletedEnter } from "@beyou/state/user/perfilSlice";
import store from "../../redux/store";
import {
    renderAuthenticatedRoute,
    restoreViewport,
    setViewport,
} from "../../test/authenticatedRoutes";

/**
 * Where the feedback bubble is allowed to be, per route and per width.
 *
 * Mobile narrowed to the configuration page once the bottom bar became global:
 * the bar reaches Config in one tap from anywhere, and Config carries the
 * bubble, so feedback is two taps from any screen without spending a seventh
 * slot in a six-item bar. Desktop has no bar and no header affordance, so the
 * bubble stays the reach everywhere except the dashboard, whose `Shortcuts`
 * sidebar already carries a labelled feedback link.
 *
 * Every row below is asserted by whether the control RENDERS, not by which
 * classes it carries — the width decision is made in JS precisely so it can be
 * observed. (jsdom evaluates no media queries, so a responsive class is
 * untestable; see the note on `setViewport`.)
 */
const VISIBILITY = [
    { route: "/feedback", mobile: false, desktop: false },
    { route: "/configuration", mobile: true, desktop: true },
    { route: "/dashboard", mobile: false, desktop: false },
    { route: "/categories", mobile: false, desktop: true },
    { route: "/habits", mobile: false, desktop: true },
    { route: "/goals", mobile: false, desktop: true },
    { route: "/tasks", mobile: false, desktop: true },
    { route: "/routines", mobile: false, desktop: true },
] as const;

beforeEach(() => {
    store.dispatch(tutorialCompletedEnter(true));
});

afterEach(() => {
    store.dispatch(tutorialCompletedEnter(false));
    restoreViewport();
});

describe("Feedback launcher", () => {
    test.each(VISIBILITY)("on mobile, $route -> $mobile", ({ route, mobile }) => {
        setViewport("mobile");
        renderAuthenticatedRoute(route);

        const launcher = screen.queryByTestId("feedback-fab");
        if (mobile) {
            expect(launcher).toBeInTheDocument();
            expect(launcher).toHaveAttribute("href", "/feedback");
        } else {
            expect(launcher).not.toBeInTheDocument();
        }
    });

    test.each(VISIBILITY)("on desktop, $route -> $desktop", ({ route, desktop }) => {
        setViewport("desktop");
        renderAuthenticatedRoute(route);

        const launcher = screen.queryByTestId("feedback-fab");
        if (desktop) {
            expect(launcher).toBeInTheDocument();
            expect(launcher).toHaveAttribute("href", "/feedback");
        } else {
            expect(launcher).not.toBeInTheDocument();
        }
    });

    test("stays out of the header — the shared Header keeps title and return only", () => {
        setViewport("desktop");
        renderAuthenticatedRoute("/habits");

        // The launcher is a fixed overlay mounted by the route guard, not a
        // child of any page's header. One was tried in the shared Header and
        // removed: that header has a fixed shape across every page.
        expect(screen.getByTestId("feedback-fab").closest("header")).toBeNull();
    });

    test("stays hidden during onboarding, like the assistant", () => {
        store.dispatch(tutorialCompletedEnter(false));
        setViewport("desktop");

        renderAuthenticatedRoute("/habits");

        expect(screen.queryByTestId("feedback-fab")).not.toBeInTheDocument();
    });

    test("mobile still reaches feedback in two taps: bar -> Config -> bubble", () => {
        setViewport("mobile");
        const onRoutines = renderAuthenticatedRoute("/routines");

        // Tap 1 is in the always-present bar...
        const toConfig = screen.getByRole("link", { name: "Config" });
        expect(toConfig).toHaveAttribute("href", "/configuration");
        expect(screen.queryByTestId("feedback-fab")).not.toBeInTheDocument();

        // Unmount before the second render: two live `ProtectedRoute` trees in
        // one document would turn a future regression into an ambiguous
        // "found multiple elements" error instead of a failing assertion.
        onRoutines.unmount();

        // ...and tap 2 is the bubble, which only Config carries on mobile.
        renderAuthenticatedRoute("/configuration");
        expect(screen.getByTestId("feedback-fab")).toBeInTheDocument();
    });
});
