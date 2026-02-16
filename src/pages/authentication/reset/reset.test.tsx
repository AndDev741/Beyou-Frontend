import { renderWithProviders } from "../../../test/test-utils";
import ResetPassword from "./reset";
import { screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("../../../services/authentication/request/validateResetTokenRequest", () => ({
    default: vi.fn().mockResolvedValue({ valid: true })
}));

vi.mock("../../../services/authentication/request/resetPasswordRequest", () => ({
    default: vi.fn().mockResolvedValue({ success: true })
}));

test("shows invalid message when token is missing", async () => {
    renderWithProviders(<ResetPassword />, { route: "/reset-password" });

    expect(await screen.findByText("ResetPasswordInvalid")).toBeInTheDocument();
});

test("shows password mismatch error", async () => {
    renderWithProviders(<ResetPassword />, { route: "/reset-password?token=test" });

    const submitButton = await screen.findByRole("button", { name: /ResetPasswordTitle/i });
    const passwordInput = screen.getByPlaceholderText("PasswordPlaceholder");
    const confirmInput = screen.getByPlaceholderText("ConfirmPasswordPlaceholder");

    fireEvent.change(passwordInput, { target: { value: "123456" } });
    fireEvent.change(confirmInput, { target: { value: "123457" } });

    fireEvent.blur(confirmInput);
    const form = passwordInput.closest("form");
    if (form) {
        fireEvent.submit(form);
    } else {
        fireEvent.click(submitButton);
    }

    expect(await screen.findByText("PasswordMismatch")).toBeInTheDocument();
});
