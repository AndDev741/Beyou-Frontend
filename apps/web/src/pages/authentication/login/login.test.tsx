import { renderWithProviders } from "../../../test/test-utils";
import Login from "./login";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";

const mockResendVerification = vi.fn();
vi.mock("@beyou/api", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@beyou/api")>()),
    resendVerification: (...args: unknown[]) => mockResendVerification(...args)
}));

const mockHandleLogin = vi.fn().mockResolvedValue(null);

vi.mock("../../../services/authentication/useGoogleLogin", () => ({
    default: vi.fn()
}));

vi.mock("../../../services/authentication/useLogin", () => ({
    default: (...args: unknown[]) => mockHandleLogin(...args)
}));

test("shows validation errors on submit", async () => {
    renderWithProviders(<Login />);

    fireEvent.click(screen.getByRole("button", { name: /Enter/i }));

    expect(await screen.findByText("YupNecessaryEmail")).toBeInTheDocument();
    expect(await screen.findByText("YupNecessaryPassword")).toBeInTheDocument();
});

/**
 * The way out of a lost verification mail.
 *
 * Before the resend endpoint existed, this screen told the user their email was not
 * verified and offered nothing to do about it — and with the address already taken by
 * the half-made account, there was no way to start over either. The button is the fix,
 * so a test that only checked the notice appears would miss the whole point.
 */
describe("resend verification", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockResendVerification.mockResolvedValue({ success: true });
    });

    const failLoginAsUnverified = async () => {
        mockHandleLogin.mockResolvedValue("EmailNotVerifiedError");
        renderWithProviders(<Login />);
        fireEvent.change(screen.getByPlaceholderText("email@gmail.com"), {
            target: { value: "stranded@test.com" }
        });
        fireEvent.change(screen.getByPlaceholderText("xxxxxxxx"), {
            target: { value: "TestPassword1!" }
        });
        fireEvent.click(screen.getByRole("button", { name: /Enter/i }));
        return screen.findByTestId("resend-verification");
    };

    it("offers a resend against the address that was refused", async () => {
        const button = await failLoginAsUnverified();

        fireEvent.click(button);

        await waitFor(() =>
            expect(mockResendVerification).toHaveBeenCalledWith("stranded@test.com"));
    });

    it("stops asking once a mail is on its way", async () => {
        const button = await failLoginAsUnverified();

        fireEvent.click(button);
        await waitFor(() => expect(button).toBeDisabled());

        // A second click inside the cooldown must not burn the token in the link the
        // user is about to open — the backend refuses it anyway, silently, so the
        // screen would otherwise claim to have sent a mail that never went.
        fireEvent.click(button);
        expect(mockResendVerification).toHaveBeenCalledTimes(1);
    });

    it("does not offer a resend before login has named an address", () => {
        mockHandleLogin.mockResolvedValue(null);
        renderWithProviders(<Login />);
        expect(screen.queryByTestId("resend-verification")).not.toBeInTheDocument();
    });
});
