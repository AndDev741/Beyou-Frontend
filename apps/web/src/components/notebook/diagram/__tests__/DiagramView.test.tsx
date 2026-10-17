import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import DiagramView from "../DiagramView";
import { lifecycle } from "./fixtures";

describe("DiagramView", () => {
    test("draws an svg image whose name is the diagram's outline, with every label as text", () => {
        render(<DiagramView spec={lifecycle} />);

        const image = screen.getByRole("img");
        expect(image.tagName.toLowerCase()).toBe("svg");
        expect(image).toHaveAttribute("aria-label", expect.stringContaining("Transaction lifecycle"));
        expect(image.getAttribute("aria-label")).toContain("Active → Committed: commit");
        for (const label of ["Active", "Committed", "Failed", "commit", "error"]) {
            expect(screen.getByText(label)).toBeInTheDocument();
        }
        // The dashed link is drawn dashed, and one box per node.
        expect(image.querySelector("path[stroke-dasharray]")).not.toBeNull();
        expect(image.querySelectorAll("rect[rx='10']")).toHaveLength(3);
    });

    /** Labels are text nodes, so a label that looks like markup is shown, never parsed. */
    test("a label that looks like markup stays text", () => {
        const spec = { ...lifecycle, nodes: lifecycle.nodes.map((n, i) => (i === 0 ? { ...n, label: "<b>x</b>" } : n)) };
        render(<DiagramView spec={spec} />);

        expect(screen.getByText("<b>x</b>")).toBeInTheDocument();
        expect(document.querySelector("svg b")).toBeNull();
    });

    test("a spec that does not draw shows the could-not-draw box instead of an image", () => {
        render(<DiagramView spec={null} />);

        expect(screen.queryByRole("img")).toBeNull();
        expect(screen.getByTestId("diagram-invalid")).toHaveTextContent("DiagramInvalid");
    });

    /** A small diagram in a wide column stops growing at 115% of its natural width. */
    test("caps how far the drawing grows past its natural size", () => {
        render(<DiagramView spec={lifecycle} />);

        const image = screen.getByRole("img");
        const [, , width] = image.getAttribute("viewBox")!.split(" ").map(Number);
        expect(image.style.maxWidth).toBe(`${Math.round(width * 1.15)}px`);
        expect(image).toHaveAttribute("width", "100%");
    });
});
