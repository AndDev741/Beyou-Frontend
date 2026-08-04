import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BottomNav from "./BottomNav";

/**
 * A barra do mobile depois do redesign: cinco alvos (Hoje, Rotinas,
 * [Assistente], Hábitos, Mais). Os destinos que saíram da barra continuam a um
 * toque dentro da sheet do "Mais" — e com o mesmo rótulo, que é como o e2e os
 * encontra.
 */
const renderAt = (pathname: string) =>
    render(
        <MemoryRouter initialEntries={[pathname]}>
            <BottomNav />
        </MemoryRouter>,
    );

const ROUTES = ["/dashboard", "/categories", "/goals", "/tasks", "/configuration", "/feedback", "/habits", "/routines"];

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
        for (const label of ["Tasks", "Goals", "Categories", "Config", "FeedbackShortcutLabel"]) {
            expect(within(sheet).getByRole("link", { name: label })).toBeInTheDocument();
        }
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
    // O item ativo marca ONDE VOCÊ ESTÁ — no máximo um por vez, e nenhum quando
    // a rota não vive na barra (que agora tem só três links).
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
