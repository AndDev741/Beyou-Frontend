import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BottomNav from "./BottomNav";
import { AUTHENTICATED_ROUTES } from "../../test/authenticatedRoutes";

/**
 * The mobile bar after the redesign: five targets (Today, Routines, [Assistant],
 * Habits, More). The destinations that left the bar are still one tap away inside the
 * "More" sheet — with the same label, which is how the e2e suite finds them.
 */
const renderAt = (pathname: string) =>
    render(
        <MemoryRouter initialEntries={[pathname]}>
            <BottomNav />
        </MemoryRouter>,
    );

const ROUTES = [...AUTHENTICATED_ROUTES];

describe("Bottom nav", () => {
    it.each(ROUTES)("renders on %s", (route) => {
        renderAt(route);
        expect(screen.getByRole("navigation", { name: "Shortcuts" })).toBeInTheDocument();
    });

    it("carries the three links, the assistant and the More trigger", () => {
        renderAt("/dashboard");
        const nav = screen.getByRole("navigation", { name: "Shortcuts" });
        expect(within(nav).getAllByRole("link")).toHaveLength(3);
        expect(within(nav).getByRole("button", { name: "OpenAssistant" })).toBeInTheDocument();
        expect(within(nav).getByText("More")).toBeInTheDocument();
    });

    it("reaches the remaining destinations through the More sheet", () => {
        renderAt("/dashboard");
        fireEvent.click(screen.getByText("More"));
        const sheet = screen.getByRole("dialog", { name: "More" });
        for (const label of ["Tasks", "Goals", "Categories", "Mood", "Config", "FeedbackShortcutLabel"]) {
            expect(within(sheet).getByRole("link", { name: label })).toBeInTheDocument();
        }
    });

    /**
     * Derived from the gate's own route list rather than a list written here, because the failure
     * this catches is forgetting one: /mood shipped reachable from the desktop sidebar and from
     * the native app's bar, and unreachable on the web at phone width — the page existed, the
     * shortcut did not, and nothing failed. A page added behind the gate with no way to tap to it
     * now fails instead of being discovered.
     */
    it("reaches every gated page from the bar or the More sheet", () => {
        renderAt("/dashboard");
        const reachable = new Set<string>();
        const collect = (scope: HTMLElement) => {
            for (const link of within(scope).getAllByRole("link")) {
                const href = link.getAttribute("href");
                if (href) reachable.add(href);
            }
        };

        collect(screen.getByRole("navigation", { name: "Shortcuts" }));
        fireEvent.click(screen.getByText("More"));
        collect(screen.getByRole("dialog", { name: "More" }));

        expect([...reachable].sort()).toEqual([...AUTHENTICATED_ROUTES].sort());
    });

    it("closes the sheet after picking a destination", () => {
        renderAt("/dashboard");
        fireEvent.click(screen.getByText("More"));
        fireEvent.click(
            within(screen.getByRole("dialog", { name: "More" })).getByRole("link", { name: "Tasks" }),
        );
        expect(screen.queryByRole("dialog", { name: "More" })).not.toBeInTheDocument();
    });
});

describe("Bottom nav active item", () => {
    // The active item marks WHERE YOU ARE — at most one at a time, and none when
    // the route does not live in the bar (which now has only three links).
    it.each([
        ["/habits", "Habits"],
        ["/routines", "Routines"],
        ["/dashboard", "Dashboard"],
        ["/tasks", null],
        ["/goals", null],
    ])("on %s highlights %s", (route, expected) => {
        renderAt(route);
        const nav = screen.getByRole("navigation", { name: "Shortcuts" });
        const active = within(nav)
            .getAllByRole("link")
            .filter((link) => link.getAttribute("aria-current") === "page");
        if (expected === null) {
            expect(active).toHaveLength(0);
        } else {
            expect(active).toHaveLength(1);
            expect(active[0]).toHaveTextContent(expected);
        }
    });
});
