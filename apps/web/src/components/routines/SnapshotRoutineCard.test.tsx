import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/test-utils";
import { SnapshotRoutineCard } from "./SnapshotRoutineCard";
import { Snapshot, SnapshotCheck, SnapshotStructureSection } from "@beyou/types/routine/snapshot";

/**
 * Bug 3 — a habit duplicated in the history view only.
 *
 * The card grouped checks by section NAME, and a section name is not unique: with
 * two sections called the same, every check landed in both. It now walks the
 * STRUCTURE and finds each item's check by `originalGroupId` (the HabitGroup PK,
 * unique per placement), so duplication is impossible by construction. The second
 * test locks in the legitimate case: the same habit genuinely placed in two
 * sections shows once in each.
 *
 * The names come from the structure (`item.name`), not from the check — that is
 * what native shows, and it keeps an item without a check in the list.
 */

function check(overrides: Partial<SnapshotCheck> & Pick<SnapshotCheck, "id" | "itemName" | "originalGroupId" | "sectionName">): SnapshotCheck {
    return {
        itemType: "HABIT",
        itemIconId: "",
        difficulty: 1,
        importance: 1,
        checked: false,
        skipped: false,
        checkTime: null,
        xpGenerated: 0,
        ...overrides,
    };
}

function section(name: string, groupId: string, orderIndex: number): SnapshotStructureSection {
    return {
        name,
        iconId: "",
        orderIndex,
        startTime: "07:00",
        endTime: "08:00",
        items: [
            {
                type: "HABIT",
                groupId,
                itemId: `item-${groupId}`,
                name: `name-${groupId}`,
                iconId: "",
                startTime: "07:00",
                endTime: "07:10",
            },
        ],
    };
}

test("does not duplicate habits across two sections that share a name", async () => {
    // Two sections named "Morning"; each holds a DIFFERENT habit.
    const snapshot: Snapshot = {
        id: "snap-1",
        routineId: "r1",
        snapshotDate: "2026-05-20",
        routineName: "My Routine",
        routineIconId: "",
        completed: false,
        structure: {
            sections: [section("Morning", "g1", 0), section("Morning", "g2", 1)],
        },
        checks: [
            check({ id: "c1", itemName: "name-g1", originalGroupId: "g1", sectionName: "Morning" }),
            check({ id: "c2", itemName: "name-g2", originalGroupId: "g2", sectionName: "Morning" }),
        ],
    };

    renderWithProviders(<SnapshotRoutineCard snapshot={snapshot} routineId="r1" />);

    // Each habit belongs to exactly one section, so it must render exactly once.
    // BUG: the sectionName filter puts both checks in both "Morning" sections,
    // so each habit renders twice.
    expect(screen.getAllByText("name-g1")).toHaveLength(1);
    expect(screen.getAllByText("name-g2")).toHaveLength(1);
});

test("renders a habit once per section when it is genuinely in two sections", async () => {
    // Same habit placed in two distinctly-named sections — legitimately appears
    // once in each (2 total). This is the correct behavior the fix must keep.
    const snapshot: Snapshot = {
        id: "snap-2",
        routineId: "r1",
        snapshotDate: "2026-05-20",
        routineName: "My Routine",
        routineIconId: "",
        completed: false,
        structure: {
            sections: [section("Morning", "g1", 0), section("Evening", "g2", 1)],
        },
        checks: [
            check({ id: "c1", itemName: "Stretch", originalGroupId: "g1", sectionName: "Morning" }),
            check({ id: "c2", itemName: "Stretch", originalGroupId: "g2", sectionName: "Evening" }),
        ],
    };

    renderWithProviders(<SnapshotRoutineCard snapshot={snapshot} routineId="r1" />);

    // One under Morning, one under Evening — the structure items carry the same
    // name in both sections.
    expect(screen.getAllByText("name-g1")).toHaveLength(1);
    expect(screen.getAllByText("name-g2")).toHaveLength(1);
});
