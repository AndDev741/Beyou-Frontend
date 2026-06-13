import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { TFunction } from "i18next";
import { vi } from "vitest";
import { useState } from "react";

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
        },
        {
            // Regression bed: react-icons really ships an icon labeled "Create"
            // (MdCreate, the Material Design pencil). Its tile must never share
            // an accessible name with a form's "Create" submit button.
            id: "icon-create",
            label: "Create",
            type: "icon" as const,
            categories: ["icons"],
            legacyIds: [],
            keywords: [],
            IconComponent: () => <span data-testid="icon-create">C</span>
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

test("keeps icon list stable when selecting an icon", async () => {
    const iconSearchIndex = await import("../icons/iconSearchIndex");
    const searchIconsSpy = vi.spyOn(iconSearchIndex, "searchIcons");
    const { default: IconsBox } = await import("./iconsBox");
    const iconRecents = await import("../icons/iconRecents");
    const { getRecentIconIds } = iconRecents;

    const t = ((key: string) => key) as unknown as TFunction;
    const Wrapper = () => {
        const [selected, setSelected] = useState("");
        return (
            <IconsBox
                search=""
                setSearch={vi.fn()}
                iconError=""
                t={t}
                selectedIcon={selected}
                setSelectedIcon={setSelected}
                minLgH={200}
            />
        );
    };

    const getRecentsMock = vi.mocked(getRecentIconIds);
    getRecentsMock.mockReturnValueOnce([]).mockReturnValue(["icon-a"]);

    render(<Wrapper />);

    const initialCalls = searchIconsSpy.mock.calls.length;

    const iconAElement = screen.getByTestId("icon-a");
    const iconAWrapper = iconAElement.closest("button") ?? iconAElement;
    fireEvent.click(iconAWrapper);

    expect(searchIconsSpy.mock.calls.length).toBe(initialCalls);

    await waitFor(() => {
        const iconWrapper = screen.getByTestId("icon-a").closest("button") ?? screen.getByTestId("icon-a");
        expect(iconWrapper).toHaveClass("text-primary");
    });
});

test("icon tiles never share an accessible name with a plain action button", async () => {
    // Undo the searchIcons spy left installed by the previous test so the real
    // (registry-mock backed) implementation runs here.
    vi.restoreAllMocks();
    const { default: IconsBox } = await import("./iconsBox");
    const iconRecents = await import("../icons/iconRecents");
    vi.mocked(iconRecents.getRecentIconIds).mockReturnValue([]);
    const t = ((key: string) => key) as unknown as TFunction;

    render(
        <IconsBox
            search=""
            setSearch={vi.fn()}
            iconError=""
            t={t}
            selectedIcon=""
            setSelectedIcon={vi.fn()}
            minLgH={200}
        />
    );

    // The "Create"-labeled icon renders, but its accessible name is prefixed
    // ("Icon: Create"), so a full-name query for "Create" finds nothing. This
    // is what keeps form tests' submit queries — and screen readers —
    // unambiguous. (String name = exact match in testing-library.)
    expect(screen.getByTestId("icon-create")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create" })).toBeNull();
    expect(screen.getByRole("button", { name: "Icon: Create" })).toBeInTheDocument();
});
