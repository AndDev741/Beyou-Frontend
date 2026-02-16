import { renderWithProviders } from "../../../test/test-utils";
import ResetPassword from "./reset";
import { screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import resetPasswordRequest from "../../../services/authentication/request/resetPasswordRequest";

vi.mock("../../../services/authentication/request/validateResetTokenRequest", () => ({
    default: vi.fn().mockResolvedValue({ valid: true })
}));

vi.mock("../../../services/authentication/request/resetPasswordRequest", () => ({
    default: vi.fn().mockResolvedValue({ success: true })
}));

const resetPasswordRequestMock = vi.mocked(resetPasswordRequest);

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

test("toggles password visibility independently", async () => {
    renderWithProviders(<ResetPassword />, { route: "/reset-password?token=test" });

    const passwordInput = await screen.findByPlaceholderText("PasswordPlaceholder");
    const confirmInput = screen.getByPlaceholderText("ConfirmPasswordPlaceholder");
    const eyeButtons = screen.getAllByLabelText("EyeToSeePassword");

    expect((passwordInput as HTMLInputElement).type).toBe("password");
    expect((confirmInput as HTMLInputElement).type).toBe("password");

    fireEvent.click(eyeButtons[0]);
    expect((passwordInput as HTMLInputElement).type).toBe("text");
    expect((confirmInput as HTMLInputElement).type).toBe("password");

    fireEvent.click(eyeButtons[1]);
    expect((passwordInput as HTMLInputElement).type).toBe("text");
    expect((confirmInput as HTMLInputElement).type).toBe("text");

    fireEvent.click(eyeButtons[0]);
    expect((passwordInput as HTMLInputElement).type).toBe("password");
    expect((confirmInput as HTMLInputElement).type).toBe("text");
});

test("shows token error after reset when token expired", async () => {
    resetPasswordRequestMock.mockResolvedValueOnce({
        error: { errorKey: "PASSWORD_RESET_TOKEN_EXPIRED" }
    });

    renderWithProviders(<ResetPassword />, { route: "/reset-password?token=test" });

    const submitButton = await screen.findByRole("button", { name: /ResetPasswordTitle/i });
    const passwordInput = screen.getByPlaceholderText("PasswordPlaceholder");
    const confirmInput = screen.getByPlaceholderText("ConfirmPasswordPlaceholder");

    fireEvent.change(passwordInput, { target: { value: "123456" } });
    fireEvent.change(confirmInput, { target: { value: "123456" } });

    fireEvent.blur(confirmInput);
    const form = passwordInput.closest("form");
    if (form) {
        fireEvent.submit(form);
    } else {
        fireEvent.click(submitButton);
    }

    expect(await screen.findByText("PASSWORD_RESET_TOKEN_EXPIRED")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ForgotPassword" })).toBeInTheDocument();
});
