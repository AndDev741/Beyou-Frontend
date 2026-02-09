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
