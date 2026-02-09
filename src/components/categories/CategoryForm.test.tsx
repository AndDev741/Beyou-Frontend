import { renderWithProviders } from "../../test/test-utils";
import CategoryForm from "./CategoryForm";
import { screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("../../services/categories/createCategory", () => ({
    default: vi.fn().mockResolvedValue({})
}));

vi.mock("../../services/categories/getCategories", () => ({
    default: vi.fn().mockResolvedValue({ success: [] })
}));

test("shows required errors for create category", async () => {
    renderWithProviders(<CategoryForm mode="create" dispatchFunction={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    expect(await screen.findByText("YupNameRequired")).toBeInTheDocument();
    expect(await screen.findByText("YupIconRequired")).toBeInTheDocument();
});
