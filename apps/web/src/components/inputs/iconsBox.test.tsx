import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { TFunction } from "i18next";
import { beforeEach, vi } from "vitest";
import { useState } from "react";

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
        },
        {
            // Regression bed: lucide really ships an icon named "circle". Its
            // tile must never share an accessible name with a form's "Circle"
            // (or any) plain action button — the picker prefixes "Icon: ".
            id: "lucide:circle",
            label: "circle",
            type: "lucide" as const,
            categories: ["icons"],
            legacyIds: [],
            keywords: [],
            lucideName: "circle",
        },
    ];

    const entryMap = Object.fromEntries(entries.map((entry) => [entry.id, entry]));

    return { entries, entryMap };
});

vi.mock("i18next", () => ({
    default: { language: "en" }
}));

// Render a deterministic, identifiable stub for each saved icon so tile queries
// stay stable across the lazy DynamicIcon boundary.
vi.mock("../../ui/BeyouIcon", () => ({
    __esModule: true,
    default: ({ id }: { id?: string | null }) => (
        <span data-testid={`beyou-icon-${id}`}>{id}</span>
    ),
}));

// `mockReset: true` (vitest config) wipes mock implementations before each
// test, so the spies below are (re)given their implementations in beforeEach.
const iconsMocks = vi.hoisted(() => ({
    searchIcons: vi.fn(),
    getRecentIconIds: vi.fn(),
}));

vi.mock("@beyou/icons", () => ({
    searchIcons: iconsMocks.searchIcons,
    getIconCategoryLabel: (category: string) => category,
    normalizeIconId: (id: string) => id,
    getEntryById: (id: string) => iconsFixture.entryMap[id],
    createIconRecents: () => ({
        getRecentIconIds: iconsMocks.getRecentIconIds,
        pushRecentIconId: vi.fn(),
        clearRecentIcons: vi.fn(),
    }),
}));

beforeEach(() => {
    iconsMocks.searchIcons.mockImplementation(() => iconsFixture.entries);
    iconsMocks.getRecentIconIds.mockReturnValue([]);
});

test("keeps icon list stable when selecting an icon", async () => {
    const icons = await import("@beyou/icons");
    const searchIconsSpy = vi.mocked(icons.searchIcons);
    const { default: IconsBox } = await import("./iconsBox");

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

    render(<Wrapper />);

    const initialCalls = searchIconsSpy.mock.calls.length;

    const iconAButton = screen.getByRole("button", { name: "Icon: Icon A" });
    fireEvent.click(iconAButton);

    expect(searchIconsSpy.mock.calls.length).toBe(initialCalls);

    await waitFor(() => {
        expect(screen.getByRole("button", { name: "Icon: Icon A" })).toHaveClass("text-primary");
    });
});

test("icon tiles never share an accessible name with a plain action button", async () => {
    const { default: IconsBox } = await import("./iconsBox");
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

    // The "circle"-labeled icon renders, but its accessible name is prefixed
    // ("Icon: circle"), so a full-name query for "circle" finds nothing. This
    // is what keeps form tests' submit queries — and screen readers —
    // unambiguous. (String name = exact match in testing-library.)
    expect(screen.getByTestId("beyou-icon-lucide:circle")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "circle" })).toBeNull();
    expect(screen.getByRole("button", { name: "Icon: circle" })).toBeInTheDocument();
});
