import { describe, expect, it, vi } from "vitest";
import type { Dispatch } from "@reduxjs/toolkit";
import { RefreshUI } from "@beyou/types/refreshUi/refreshUi.type";
import { applyRefreshUi } from "../refreshUiThunk";
import { celebrationPushed } from "../../celebration/celebrationSlice";
import { refreshCategorie } from "../../category/categoriesSlice";
import { refreshItemGroup } from "../../routine/todayRoutineSlice";
import { levelEnter, xpEnter, constanceEnter } from "../perfilSlice";

function makeRefresh(overrides: Partial<RefreshUI["refreshUser"]> = {}): RefreshUI {
  return {
    refreshUser: {
      currentConstance: 7,
      alreadyIncreaseConstanceToday: true,
      maxConstance: 7,
      xp: 100,
      level: 3,
      actualLevelXp: 80,
      nextLevelXp: 120,
      ...overrides,
    },
    refreshCategories: [{ id: "c1", xp: 10, level: 1, actualLevelXp: 0, nextLevelXp: 20 }],
    refreshItemChecked: {
      groupItemId: "g1",
      check: { id: "k1", checkDate: "2026-06-17", checkTime: "10:00", checked: true, xpGenerated: 5 },
    },
  };
}

function collect() {
  const actions: any[] = [];
  const dispatch = vi.fn((a) => {
    actions.push(a);
    return a;
  }) as unknown as Dispatch;
  return { actions, dispatch };
}

describe("applyRefreshUi", () => {
  it("does nothing for a null/undefined payload", () => {
    const { actions, dispatch } = collect();
    applyRefreshUi(undefined, dispatch, { level: 1, constance: 0 });
    expect(actions).toHaveLength(0);
  });

  it("dispatches the perfil updates", () => {
    const { actions, dispatch } = collect();
    applyRefreshUi(makeRefresh(), dispatch, { level: 3, constance: 7 });
    expect(actions.some((a) => xpEnter.match(a) && a.payload === 100)).toBe(true);
    expect(actions.some((a) => levelEnter.match(a) && a.payload === 3)).toBe(true);
    expect(actions.some((a) => constanceEnter.match(a) && a.payload === 7)).toBe(true);
  });

  it("queues a level-up celebration when level increased", () => {
    const { actions, dispatch } = collect();
    applyRefreshUi(makeRefresh({ level: 3 }), dispatch, { level: 2, constance: 7 });
    expect(actions.some((a) => celebrationPushed.match(a) && a.payload.kind === "levelUp")).toBe(true);
  });

  it("queues a streak-milestone celebration only when a milestone is crossed", () => {
    const { actions, dispatch } = collect();
    applyRefreshUi(makeRefresh({ currentConstance: 7 }), dispatch, { level: 3, constance: 6 });
    expect(
      actions.some((a) => celebrationPushed.match(a) && a.payload.kind === "streakMilestone" && a.payload.days === 7),
    ).toBe(true);
  });

  it("does NOT celebrate when neither level nor a milestone changed", () => {
    const { actions, dispatch } = collect();
    applyRefreshUi(makeRefresh({ level: 3, currentConstance: 8 }), dispatch, { level: 3, constance: 7 });
    expect(actions.some((a) => celebrationPushed.match(a))).toBe(false);
  });

  it("honors skipCelebrations (still applies updates)", () => {
    const { actions, dispatch } = collect();
    applyRefreshUi(makeRefresh({ level: 3, currentConstance: 7 }), dispatch, { level: 2, constance: 6 }, { skipCelebrations: true });
    expect(actions.some((a) => celebrationPushed.match(a))).toBe(false);
    expect(actions.some((a) => levelEnter.match(a))).toBe(true);
  });

  it("refreshes touched categories and the checked item group", () => {
    const { actions, dispatch } = collect();
    applyRefreshUi(makeRefresh(), dispatch, { level: 3, constance: 7 });
    expect(actions.some((a) => refreshCategorie.match(a) && a.payload.id === "c1")).toBe(true);
    expect(actions.some((a) => refreshItemGroup.match(a) && a.payload.groupItemId === "g1")).toBe(true);
  });
});
