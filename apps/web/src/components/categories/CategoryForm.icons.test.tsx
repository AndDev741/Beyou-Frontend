import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithProviders } from "../../test/test-utils";

const iconsFixture = vi.hoisted(() => {
    const entries = [
        {
            id: "lucide:icon-a",
            label: "Icon A",
            type: "lucide" as const,
            categories: ["icons"],
            legacyIds: [],
            keywords: [],
            lucideName: "icon-a",
        },
        {
            id: "lucide:icon-b",
            label: "Icon B",
            type: "lucide" as const,
            categories: ["icons"],
            legacyIds: [],
            keywords: [],
            lucideName: "icon-b",
        }
    ];

    const entryMap = Object.fromEntries(entries.map((entry) => [entry.id, entry]));

    return { entries, entryMap };
});

vi.mock("i18next", () => ({
    default: { language: "en" }
}));

vi.mock("../../ui/BeyouIcon", () => ({
    __esModule: true,
    default: ({ id }: { id?: string | null }) => (
        <span data-testid={`beyou-icon-${id}`}>{id}</span>
    ),
}));

vi.mock("@beyou/icons", () => {
    const searchIcons = vi.fn(() => iconsFixture.entries);
    return {
        searchIcons,
        getIconCategoryLabel: (category: string) => category,
        normalizeIconId: (id: string) => id,
        getEntryById: (id: string) => iconsFixture.entryMap[id],
        createIconRecents: () => ({
            getRecentIconIds: vi.fn(() => [] as string[]),
            pushRecentIconId: vi.fn(),
            clearRecentIcons: vi.fn(),
        }),
    };
});

vi.mock("@beyou/api/categories/createCategory", () => ({
    default: vi.fn().mockResolvedValue({ success: true })
}));

vi.mock("@beyou/api/categories/getCategories", () => ({
    default: vi.fn().mockResolvedValue({ success: [] })
}));

test("submits selected icon for category creation", async () => {
    const icons = await import("@beyou/icons");
    vi.spyOn(icons, "searchIcons");
    const { default: CategoryForm } = await import("./CategoryForm");
    const createCategoryModule = await import("@beyou/api/categories/createCategory");
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

    fireEvent.click(screen.getByRole("button", { name: "Icon: Icon A" }));

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
        expect(vi.mocked(createCategory)).toHaveBeenCalled();
    });

    expect(vi.mocked(createCategory)).toHaveBeenCalledWith(
        "Health",
        "",
        0,
        "lucide:icon-a",
        expect.any(Function)
    );

});
