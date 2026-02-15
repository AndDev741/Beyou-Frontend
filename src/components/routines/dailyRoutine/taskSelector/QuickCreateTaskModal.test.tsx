import { renderWithProviders } from "../../../../test/test-utils";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import QuickCreateTaskModal from "./QuickCreateTaskModal";
import createTask from "../../../../services/tasks/createTask";
import getTasks from "../../../../services/tasks/getTasks";

vi.mock("../../../../services/tasks/createTask", () => ({
    default: vi.fn().mockResolvedValue({ success: true })
}));

vi.mock("../../../../services/tasks/getTasks", () => ({
    default: vi.fn().mockResolvedValue({
        success: [{ id: "t1", name: "Clean the house", iconId: "icon" }]
    })
}));

vi.mock("../../../inputs/iconsBoxSmall", () => ({
    default: ({ setSelectedIcon }: { setSelectedIcon: (value: string) => void }) => (
        <button type="button" onClick={() => setSelectedIcon("icon")}>pick icon</button>
    )
}));

vi.mock("../../../inputs/chooseCategory/chooseCategories", () => ({
    default: ({ setCategoriesIdList }: { setCategoriesIdList: (value: string[]) => void }) => (
        <button type="button" onClick={() => setCategoriesIdList(["cat-1"])}>pick categories</button>
    )
}));

vi.mock("../../../inputs/chooseInput", () => ({
    default: ({ setLevel, title }: { setLevel: (value: number) => void; title: string }) => (
        <button type="button" onClick={() => setLevel(1)}>{`pick ${title}`}</button>
    )
}));

vi.mock("react-toastify", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn()
    }
}));

test("creates task and returns new id", async () => {
    const onCreated = vi.fn();
    vi.mocked(createTask).mockResolvedValue({ success: true });
    vi.mocked(getTasks).mockResolvedValue({
        success: [
            {
                id: "t1",
                name: "Clean the house",
                description: "",
                iconId: "icon",
                importance: 1,
                dificulty: 1,
                categories: {},
                oneTimeTask: false,
                markedToDelete: new Date(0),
                createdAt: new Date(0),
                updatedAt: new Date(0)
            }
        ]
    });

    renderWithProviders(
        <QuickCreateTaskModal isOpen={true} onClose={vi.fn()} onCreated={onCreated} />
    );

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Clean the house" } });
    fireEvent.click(screen.getByText("pick icon"));
    fireEvent.click(screen.getByText("pick Importance"));
    fireEvent.click(screen.getByText("pick Difficulty"));
    fireEvent.click(screen.getByText("pick categories"));

    const form = document.querySelector("form");
    if (form) {
        fireEvent.submit(form);
    } else {
        fireEvent.click(screen.getByRole("button", { name: /Create/i }));
    }

    await waitFor(() => {
        expect(vi.mocked(createTask)).toHaveBeenCalled();
        expect(vi.mocked(getTasks)).toHaveBeenCalled();
        expect(onCreated).toHaveBeenCalledWith("t1");
    });
});
