import { renderWithProviders } from "../../../test/test-utils";
import Login from "./login";
import { screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("../../../services/authentication/useGoogleLogin", () => ({
    default: vi.fn()
}));

vi.mock("../../../services/authentication/useLogin", () => ({
    default: vi.fn().mockResolvedValue(null)
}));

test("shows validation errors on submit", async () => {
    renderWithProviders(<Login />);

    fireEvent.click(screen.getByRole("button", { name: /Enter/i }));

    expect(await screen.findByText("YupNecessaryEmail")).toBeInTheDocument();
    expect(await screen.findByText("YupNecessaryPassword")).toBeInTheDocument();
});
