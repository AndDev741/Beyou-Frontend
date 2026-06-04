import { render, screen } from "@testing-library/react";
import PasswordHints from "./PasswordHints";

test("marks all hints pending for a weak password", () => {
    render(<PasswordHints password="abc" />);
    expect(screen.getByTestId("PasswordHintLength-pending")).toBeInTheDocument();
    expect(screen.getByTestId("PasswordHintClasses-pending")).toBeInTheDocument();
});

test("marks all hints satisfied for a strong password", () => {
    render(<PasswordHints password="StrongPass123!" />);
    expect(screen.getByTestId("PasswordHintLength-ok")).toBeInTheDocument();
    expect(screen.getByTestId("PasswordHintClasses-ok")).toBeInTheDocument();
});

test("trims whitespace like the zod schema before evaluating length", () => {
    // 12 raw chars but only 9 after trim — the schema would reject this,
    // so the length hint must stay pending.
    render(<PasswordHints password="   abc123!XY" />);
    expect(screen.getByTestId("PasswordHintLength-pending")).toBeInTheDocument();
    expect(screen.getByTestId("PasswordHintClasses-ok")).toBeInTheDocument();
});
