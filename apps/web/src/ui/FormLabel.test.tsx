import { render, screen } from "@testing-library/react";
import FormLabel from "./FormLabel";

describe("FormLabel", () => {
    it("draws the required asterisk as generated content, not as text", () => {
        render(
            <>
                <FormLabel htmlFor="f" required>Name</FormLabel>
                <input id="f" />
            </>
        );
        const label = screen.getByText("Name");
        expect(label.tagName).toBe("LABEL");
        expect(label.getAttribute("data-marker")).toBe("*");
        expect(label.textContent).toBe("Name");
        expect(screen.getByLabelText("Name")).toHaveAttribute("id", "f");
    });

    it("writes the optional marker from the FieldOptional key and renders a span without htmlFor", () => {
        render(<FormLabel optional>Description</FormLabel>);
        const label = screen.getByText("Description");
        expect(label.tagName).toBe("SPAN");
        expect(label.getAttribute("data-marker")).toContain("FieldOptional");
        expect(label.textContent).toBe("Description");
    });

    it("stays bare with no flag and honours `as`", () => {
        render(<FormLabel as="legend">Category</FormLabel>);
        const label = screen.getByText("Category");
        expect(label.tagName).toBe("LEGEND");
        expect(label.hasAttribute("data-marker")).toBe(false);
    });
});
