import { render, screen } from "@testing-library/react";
import Button from "./Button";

test("keeps the label as the accessible name when it collapses to an icon", () => {
    render(<Button text="Create routine" size="medium" mode="primary" collapseLabel icon={<span>+</span>} />);

    // On a phone only the icon shows, but the accessible name has to survive: it is
    // how the screen reader and the e2e suite find the button.
    expect(screen.getByRole("button", { name: "Create routine" })).toBeInTheDocument();
});

test("disables itself when asked", () => {
    render(<Button text="Save" size="medium" mode="primary" disabled />);

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
});
