import { renderWithProviders } from "../../../test/test-utils";
import ForgotPassword from "./forgot";
import { screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("../../../services/authentication/request/forgotPasswordRequest", () => ({
    default: vi.fn().mockResolvedValue({ success: true })
}));

test("shows validation errors on submit", async () => {
    renderWithProviders(<ForgotPassword />);

    fireEvent.click(screen.getByRole("button", { name: /SendResetLink/i }));

    expect(await screen.findByText("YupNecessaryEmail")).toBeInTheDocument();
});
