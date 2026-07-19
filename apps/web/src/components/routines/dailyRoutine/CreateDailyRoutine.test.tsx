import { renderWithProviders } from "../../../test/test-utils";
import CreateDailyRoutine from "./CreateDailyRoutine";
import { screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@beyou/api/routine/createRoutine", () => ({
    default: vi.fn().mockResolvedValue({})
}));

vi.mock("@beyou/api/routine/getRoutines", () => ({
    default: vi.fn().mockResolvedValue({ success: [] })
}));

test("shows validation errors for missing name and sections", async () => {
    renderWithProviders(<CreateDailyRoutine />);

    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));

    expect(await screen.findByText("YupNameRequired")).toBeInTheDocument();
    expect(await screen.findByText("At least, 1 section need to be created")).toBeInTheDocument();
});
