import { render, screen } from "@testing-library/react";
import Button from "./Button";

test("keeps the label as the accessible name when it collapses to an icon", () => {
    render(<Button text="Create routine" size="medium" mode="primary" collapseLabel icon={<span>+</span>} />);

    // No telefone só o ícone aparece, mas o nome acessível tem de sobreviver:
    // é por ele que leitor de tela e a suíte e2e encontram o botão.
    expect(screen.getByRole("button", { name: "Create routine" })).toBeInTheDocument();
});

test("disables itself when asked", () => {
    render(<Button text="Save" size="medium" mode="primary" disabled />);

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
});
