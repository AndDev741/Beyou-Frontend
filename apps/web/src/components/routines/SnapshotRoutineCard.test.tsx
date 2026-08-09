import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/test-utils";
import { SnapshotRoutineCard } from "./SnapshotRoutineCard";
import { Snapshot, SnapshotCheck, SnapshotStructureSection } from "@beyou/types/routine/snapshot";

/**
 * Bug 3 — hábito duplicado só na visualização de histórico.
 *
 * O cartão agrupava os checks por NOME de seção, e nome de seção não é único:
 * com duas seções chamadas igual, todo check caía nas duas. Hoje ele percorre a
 * ESTRUTURA e busca o check de cada item pelo `originalGroupId` (a PK do
 * HabitGroup, única por posição), então a duplicação é impossível por
 * construção. O segundo teste tranca o caso legítimo: o mesmo hábito posto de
 * verdade em duas seções aparece uma vez em cada.
 *
 * Os nomes vêm da estrutura (`item.name`), não do check — é o que o nativo
 * mostra, e assim um item sem check ainda aparece na lista.
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

    // Uma ocorrência em Manhã, outra em Noite — os itens da estrutura têm o
    // mesmo nome nas duas seções.
    expect(screen.getAllByText("name-g1")).toHaveLength(1);
    expect(screen.getAllByText("name-g2")).toHaveLength(1);
});
