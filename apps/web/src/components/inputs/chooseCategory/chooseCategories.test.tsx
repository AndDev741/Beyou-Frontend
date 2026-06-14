import { renderWithProviders } from "../../../test/test-utils";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import ChooseCategories from "./chooseCategories";
import getCategories from "@beyou/api/categories/getCategories";

vi.mock("@beyou/api/categories/getCategories", () => ({
    default: vi.fn()
}));

vi.mock("../../categories/CategoryForm", () => ({
    default: ({ onCreated }: { onCreated?: (values: { name: string; description: string; iconId: string }) => void }) => (
        <button
            type="button"
            onClick={() => onCreated?.({ name: "Work", description: "", iconId: "icon" })}
        >
            MockCreateCategory
        </button>
    )
}));

test("adds newly created category to selection", async () => {
    const getCategoriesMock = vi.mocked(getCategories);
    getCategoriesMock.mockResolvedValue({
        success: [
            {
                id: "cat-1",
                name: "Work",
                description: "",
                iconId: "icon",
                xp: 0,
                nextLevelXp: 0,
                actualLevelXp: 0,
                level: 0,
                createdAt: new Date(0)
            }
        ]
    });

    const setCategoriesIdList = vi.fn();

    renderWithProviders(
        <ChooseCategories
            categoriesIdList={[]}
            setCategoriesIdList={setCategoriesIdList}
            errorMessage=""
        />
    );

    fireEvent.click(screen.getByLabelText(/Add Category|AddCategory/i));
    fireEvent.click(screen.getByText("MockCreateCategory"));

    await waitFor(() => {
        expect(setCategoriesIdList).toHaveBeenCalledWith(["cat-1"]);
    });
});

test("does not add a category twice when it is already selected", async () => {
    const getCategoriesMock = vi.mocked(getCategories);
    getCategoriesMock.mockResolvedValue({
        success: [
            {
                id: "cat-1",
                name: "Work",
                description: "",
                iconId: "icon",
                xp: 0,
                nextLevelXp: 0,
                actualLevelXp: 0,
                level: 0,
                createdAt: new Date(0)
            }
        ]
    });

    const setCategoriesIdList = vi.fn();

    // The category is already in the list but the checkbox may render unchecked
    // (UI desync). Clicking it must NOT append a duplicate id.
    renderWithProviders(
        <ChooseCategories
            categoriesIdList={["cat-1"]}
            setCategoriesIdList={setCategoriesIdList}
            errorMessage=""
        />
    );

    const checkbox = await screen.findByRole("checkbox", { name: "Work" });
    fireEvent.click(checkbox);

    await waitFor(() => {
        expect(setCategoriesIdList).toHaveBeenCalled();
    });
    // Every update must keep "cat-1" unique — never ["cat-1", "cat-1"].
    for (const call of setCategoriesIdList.mock.calls) {
        expect(call[0]).toEqual(["cat-1"]);
    }
});
