import { renderWithProviders } from "../../../test/test-utils";
import Register from "./register";
import { screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("../../../services/authentication/handleRegister", () => ({
    default: vi.fn().mockResolvedValue(null)
}));

test("shows validation errors on submit", async () => {
    renderWithProviders(<Register />);

    fireEvent.click(screen.getByRole("button", { name: /ToRegister/i }));

    expect(await screen.findByText("YupNameRequired")).toBeInTheDocument();
    expect(await screen.findByText("YupNecessaryEmail")).toBeInTheDocument();
    expect(await screen.findByText("YupNecessaryPassword")).toBeInTheDocument();
});

/**
 * Registering is the moment the agreement is formed, so the policy has to be
 * readable from this screen rather than only from the store listing.
 */
test("points at the privacy policy before the account is created", async () => {
    renderWithProviders(<Register />);

    const link = await screen.findByTestId("register-privacy-link");
    expect(link).toHaveAttribute("href", "https://beyouweb.com/privacy/");
    expect(screen.getByText(/RegisterPrivacyNotice/)).toBeInTheDocument();
});
