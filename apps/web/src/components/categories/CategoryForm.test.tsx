import { renderWithProviders } from "../../test/test-utils";
import CategoryForm from "./CategoryForm";
import { screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@beyou/api/categories/createCategory", () => ({
    default: vi.fn().mockResolvedValue({})
}));

vi.mock("@beyou/api/categories/getCategories", () => ({
    default: vi.fn().mockResolvedValue({ success: [] })
}));

test("shows required errors for create category", async () => {
    renderWithProviders(<CategoryForm mode="create" dispatchFunction={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("YupNameRequired")).toBeInTheDocument();
    expect(await screen.findByText("YupIconRequired")).toBeInTheDocument();
});
