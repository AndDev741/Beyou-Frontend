import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithProviders } from "../../test/test-utils";

const iconsFixture = vi.hoisted(() => {
    const entries = [
        {
            id: "icon-a",
            label: "Icon A",
            type: "icon" as const,
            categories: ["icons"],
            legacyIds: [],
            keywords: [],
            IconComponent: () => <span data-testid="icon-a">A</span>
        },
        {
            id: "icon-b",
            label: "Icon B",
            type: "icon" as const,
            categories: ["icons"],
            legacyIds: [],
            keywords: [],
            IconComponent: () => <span data-testid="icon-b">B</span>
        }
    ];

    const entryMap = Object.fromEntries(entries.map((entry) => [entry.id, entry]));

    return { entries, entryMap };
});

vi.mock("i18next", () => ({
    default: { language: "en" }
}));

vi.mock("../icons/iconRecents", () => ({
    getRecentIconIds: vi.fn(() => []),
    pushRecentIconId: vi.fn()
}));

vi.mock("../icons/iconRegistry", () => ({
    allEntries: iconsFixture.entries,
    getAvailableCategories: () => ["icons"],
    getCanonicalId: (id: string) => id,
    getEntryById: (id: string) => iconsFixture.entryMap[id]
}));

vi.mock("../../services/categories/createCategory", () => ({
    default: vi.fn().mockResolvedValue({ success: true })
}));

vi.mock("../../services/categories/getCategories", () => ({
    default: vi.fn().mockResolvedValue({ success: [] })
}));

test("submits selected icon for category creation", async () => {
    const iconSearchIndex = await import("../icons/iconSearchIndex");
    vi.spyOn(iconSearchIndex, "searchIcons");
    const { default: CategoryForm } = await import("./CategoryForm");
    const createCategoryModule = await import("../../services/categories/createCategory");
    const createCategory = createCategoryModule.default;

    renderWithProviders(
        <CategoryForm
            mode="create"
            dispatchFunction={(payload: unknown) => ({ type: "test/enterCategories", payload })}
        />
    );

    fireEvent.change(screen.getByLabelText("Name"), {
        target: { value: "Health" }
    });

    const iconAElement = screen.getByTestId("icon-a");
    const iconAWrapper = iconAElement.closest("p") ?? iconAElement;
    fireEvent.click(iconAWrapper);

    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
        expect(vi.mocked(createCategory)).toHaveBeenCalled();
    });

    expect(vi.mocked(createCategory)).toHaveBeenCalledWith(
        "Health",
        "",
        0,
        "icon-a",
        expect.any(Function)
    );

});
