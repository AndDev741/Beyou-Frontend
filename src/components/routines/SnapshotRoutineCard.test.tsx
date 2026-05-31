import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/test-utils";
import { SnapshotRoutineCard } from "./SnapshotRoutineCard";
import { Snapshot, SnapshotCheck, SnapshotStructureSection } from "../../types/routine/snapshot";

/**
 * Bug 3 — habits duplicated in the routine SNAPSHOT view only.
 *
 * SnapshotRoutineCard buckets checks into sections by matching on the section
 * NAME (`c.sectionName === section.name`). Section names are not unique, so
 * when a routine has two sections sharing a name, every check for that name
 * lands in BOTH rendered sections — duplicating habits. The regular routine
 * view (RoutineCard) does not have this bug because it walks the real nested
 * section objects instead of filtering a flat list by name.
 *
 * The backend snapshot data is correct: each check carries a unique
 * `originalGroupId` (the HabitGroup PK) scoping it to one placement. The fix is
 * to bucket by originalGroupId membership, not by section name.
 *
 * The first test reproduces the bug (FAILS on the current build). The second
 * locks in the legitimate "same habit genuinely in two sections" case so the
 * fix doesn't regress it.
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

async function expand() {
    // The section list only renders once the card is expanded.
    fireEvent.click(screen.getByRole("button", { name: "Expand" }));
}

test("does not duplicate habits across two sections that share a name", async () => {
    // Two sections named "Morning"; each holds a DIFFERENT habit.
    const snapshot: Snapshot = {
        id: "snap-1",
        snapshotDate: "2026-05-20",
        routineName: "My Routine",
        routineIconId: "",
        completed: false,
        structure: {
            sections: [section("Morning", "g1", 0), section("Morning", "g2", 1)],
        },
        checks: [
            check({ id: "c1", itemName: "Meditate", originalGroupId: "g1", sectionName: "Morning" }),
            check({ id: "c2", itemName: "Workout", originalGroupId: "g2", sectionName: "Morning" }),
        ],
    };

    renderWithProviders(<SnapshotRoutineCard snapshot={snapshot} routineId="r1" />);
    await expand();

    // Each habit belongs to exactly one section, so it must render exactly once.
    // BUG: the sectionName filter puts both checks in both "Morning" sections,
    // so each habit renders twice.
    expect(screen.getAllByText("Meditate")).toHaveLength(1);
    expect(screen.getAllByText("Workout")).toHaveLength(1);
});

test("renders a habit once per section when it is genuinely in two sections", async () => {
    // Same habit placed in two distinctly-named sections — legitimately appears
    // once in each (2 total). This is the correct behavior the fix must keep.
    const snapshot: Snapshot = {
        id: "snap-2",
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
    await expand();

    // One occurrence under Morning, one under Evening.
    expect(screen.getAllByText("Stretch")).toHaveLength(2);
});
