import { renderWithProviders } from "../../../../test/test-utils";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import QuickCreateHabitModal from "./QuickCreateHabitModal";
import createHabit from "@beyou/api/habits/createHabit";
import getHabits from "@beyou/api/habits/getHabits";

vi.mock("@beyou/api/habits/createHabit", () => ({
    default: vi.fn().mockResolvedValue({ success: true })
}));

vi.mock("@beyou/api/habits/getHabits", () => ({
    default: vi.fn().mockResolvedValue({
        success: [{ id: "h1", name: "Read", iconId: "icon" }]
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

vi.mock("react-toastify", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn()
    }
}));

test("creates habit and returns new id", async () => {
    const onCreated = vi.fn();
    vi.mocked(createHabit).mockResolvedValue({ success: true });
    vi.mocked(getHabits).mockResolvedValue({
        success: [
            {
                id: "h1",
                name: "Read",
                description: "",
                motivationalPhrase: "",
                iconId: "icon",
                categories: [],
                routines: {},
                importance: 1,
                dificulty: 1,
                xp: 0,
                level: 0,
                nextLevelXp: 0,
                actualLevelXp: 0,
                constance: 0,
                createdAt: new Date(0),
                updatedAt: new Date(0)
            }
        ]
    });

    renderWithProviders(
        <QuickCreateHabitModal isOpen={true} onClose={vi.fn()} onCreated={onCreated} />
    );

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Read" } });
    fireEvent.click(screen.getByText("pick icon"));
    // Importance, difficulty and experience became segmented controls: every option
    // is a radio with its own label.
    fireEvent.click(screen.getByRole("radio", { name: "Low" }));
    fireEvent.click(screen.getByRole("radio", { name: "Easy" }));
    fireEvent.click(screen.getByRole("radio", { name: "Beginner" }));
    fireEvent.click(screen.getByText("pick categories"));

    const form = document.querySelector("form");
    if (form) {
        fireEvent.submit(form);
    } else {
        fireEvent.click(screen.getByRole("button", { name: "Save habit" }));
    }

    await waitFor(() => {
        expect(vi.mocked(createHabit)).toHaveBeenCalled();
        expect(vi.mocked(getHabits)).toHaveBeenCalled();
        expect(onCreated).toHaveBeenCalledWith("h1");
    });
});
