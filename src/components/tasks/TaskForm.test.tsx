import { renderWithProviders } from "../../test/test-utils";
import TaskForm from "./TaskForm";
import { screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("../../services/tasks/createTask", () => ({
    default: vi.fn().mockResolvedValue({})
}));

vi.mock("../../services/tasks/getTasks", () => ({
    default: vi.fn().mockResolvedValue({ success: [] })
}));


test("shows required errors for create task", async () => {
    renderWithProviders(<TaskForm mode="create" setTasks={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    expect(await screen.findByText("YupNameRequired")).toBeInTheDocument();
    expect(await screen.findByText("YupIconRequired")).toBeInTheDocument();
});
