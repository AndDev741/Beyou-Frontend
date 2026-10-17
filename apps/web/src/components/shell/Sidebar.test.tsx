import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../test/test-utils";
import Sidebar from "./Sidebar";

describe("Sidebar", () => {
    it("lists Ideas right after Notebook, pointing at /ideas", () => {
        renderWithProviders(<Sidebar />, { route: "/dashboard" });
        const nav = within(screen.getByRole("complementary", { name: "Shortcuts" })).getAllByRole("navigation")[0];
        const links = within(nav).getAllByRole("link");
        const labels = links.map((link) => link.textContent);

        const ideas = labels.indexOf("Ideas");
        expect(ideas).toBe(labels.indexOf("Notebook") + 1);
        expect(links[ideas]).toHaveAttribute("href", "/ideas");
    });
});
