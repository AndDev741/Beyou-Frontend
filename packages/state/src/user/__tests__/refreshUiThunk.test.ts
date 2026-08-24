import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Dispatch } from "@reduxjs/toolkit";
import { RefreshUI } from "@beyou/types/refreshUi/refreshUi.type";
import { ANALYTICS_EVENTS, getAnalytics, setAnalytics } from "@beyou/api";
import { applyRefreshUi } from "../refreshUiThunk";
import { celebrationPushed } from "../../celebration/celebrationSlice";
import { refreshCategorie } from "../../category/categoriesSlice";
import { refreshItemGroup } from "../../routine/todayRoutineSlice";
import { refreshHabit } from "../../habit/habitsSlice";
import { levelEnter, xpEnter, constanceEnter, constanceDormantEnter, checkRecorded } from "../perfilSlice";

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

  it("carries the habit's post-check numbers into the habits slice", () => {
    const { actions, dispatch } = collect();
    const payload = makeRefresh();
    payload.refreshHabit = {
      id: "h1",
      xp: 40,
      level: 2,
      actualLevelXp: 20,
      nextLevelXp: 60,
      currentStreak: 6,
      bestStreak: 9,
      totalCheckIns: 33,
    };
    applyRefreshUi(payload, dispatch, { level: 3, constance: 7 });
    const action = actions.find((a) => refreshHabit.match(a));
    expect(action?.payload).toMatchObject({ id: "h1", currentStreak: 6, bestStreak: 9, totalCheckIns: 33 });
  });

  it("does not touch the habits slice when the payload carries no habit", () => {
    const { actions, dispatch } = collect();
    applyRefreshUi(makeRefresh(), dispatch, { level: 3, constance: 7 });
    expect(actions.some((a) => refreshHabit.match(a))).toBe(false);
  });

  it("ticks the check revision so the day strips re-read their history", () => {
    // The strips fetch once on mount. Without the tick, a check moves the number
    // and leaves today's square drawn as still open until the next page load.
    const { actions, dispatch } = collect();
    applyRefreshUi(makeRefresh(), dispatch, { level: 3, constance: 7 });
    expect(actions.filter((a) => checkRecorded.match(a))).toHaveLength(1);
  });

  it("ticks nothing for a payload that refreshed nothing", () => {
    const { actions, dispatch } = collect();
    applyRefreshUi({}, dispatch, { level: 1, constance: 0 });
    expect(actions).toHaveLength(0);
  });

  it("clears dormancy: a run cannot be paused in the request that just fed it", () => {
    const { actions, dispatch } = collect();
    applyRefreshUi(makeRefresh(), dispatch, { level: 3, constance: 7 });
    expect(actions.some((a) => constanceDormantEnter.match(a) && a.payload === false)).toBe(true);
  });
});

/**
 * Phase 0 of the engagement work. These events are the ones the later nudge job is
 * measured against, so what matters is not that `track` was called but that it was
 * called for the right population: a check is a check, a goal action is not, and a day
 * filled in after the fact is still a real level-up.
 */
describe("applyRefreshUi — product analytics", () => {
  beforeEach(() => {
    setAnalytics({ identify: vi.fn(), reset: vi.fn(), track: vi.fn() });
  });

  function tracked(event: string) {
    return (getAnalytics().track as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([name]) => name === event,
    );
  }

  it("tracks a check with the check's own numbers", () => {
    const { dispatch } = collect();
    applyRefreshUi(makeRefresh(), dispatch, { level: 3, constance: 7 });

    expect(tracked(ANALYTICS_EVENTS.CHECK_RECORDED)).toEqual([
      [
        ANALYTICS_EVENTS.CHECK_RECORDED,
        { retroactive: false, skipped: false, xp_generated: 5, owner: "routine_item" },
      ],
    ]);
  });

  /**
   * The snapshot check-in path — the only caller that passes skipCelebrations — is a
   * user filling in an earlier day, which is exactly the behaviour the XP-decay nudge
   * exists to produce. If it were indistinguishable from a same-day check, the nudge
   * could never be shown to have worked.
   */
  it("marks a backfilled day as retroactive", () => {
    const { dispatch } = collect();
    applyRefreshUi(makeRefresh(), dispatch, { level: 3, constance: 7 }, { skipCelebrations: true });

    expect(tracked(ANALYTICS_EVENTS.CHECK_RECORDED)[0][1]).toMatchObject({ retroactive: true });
  });

  /**
   * A skip keeps a streak alive without anything having been done. A funnel that could
   * not tell the two apart would read a week of skips as a week of progress.
   */
  it("distinguishes a skip from a completion", () => {
    const { dispatch } = collect();
    const refresh = makeRefresh();
    refresh.refreshItemChecked!.check.skipped = true;
    refresh.refreshItemChecked!.check.xpGenerated = 0;

    applyRefreshUi(refresh, dispatch, { level: 3, constance: 7 });

    expect(tracked(ANALYTICS_EVENTS.CHECK_RECORDED)[0][1]).toMatchObject({
      skipped: true,
      xp_generated: 0,
    });
  });

  /**
   * Goal actions come through this same function and also refresh the perfil and
   * categories (see useGoalActions → PUT /goal/complete|increase). Counting them as
   * check-ins would inflate every completion rate in the product, which is the metric
   * the whole phase exists to measure.
   */
  it("does not count a goal action as a check", () => {
    const { dispatch } = collect();
    const goalShaped = {
      refreshUser: makeRefresh().refreshUser,
      refreshCategories: [{ id: "c1", xp: 10, level: 1, actualLevelXp: 0, nextLevelXp: 20 }],
    } as RefreshUI;

    applyRefreshUi(goalShaped, dispatch, { level: 3, constance: 7 });

    expect(tracked(ANALYTICS_EVENTS.CHECK_RECORDED)).toHaveLength(0);
  });

  it("tracks a habit checked outside a routine as a check", () => {
    const { dispatch } = collect();
    const habitOnly = {
      refreshHabit: { id: "h1", xp: 10, level: 1, actualLevelXp: 0, nextLevelXp: 20 },
    } as RefreshUI;

    applyRefreshUi(habitOnly, dispatch, { level: 1, constance: 0 });

    expect(tracked(ANALYTICS_EVENTS.CHECK_RECORDED)[0][1]).toMatchObject({ owner: "habit" });
  });

  /**
   * Suppressing confetti on a backfilled day is a UI decision. The level really did go
   * up and the streak really did cross the milestone, so both events fire regardless —
   * otherwise the retroactive path, the one the nudge drives, would under-report exactly
   * the outcomes that prove it worked.
   */
  it("still reports a level-up and a milestone when the celebrations are suppressed", () => {
    const { actions, dispatch } = collect();
    applyRefreshUi(
      makeRefresh({ level: 4, currentConstance: 7 }),
      dispatch,
      { level: 3, constance: 6 },
      { skipCelebrations: true },
    );

    expect(actions.some((a) => celebrationPushed.match(a))).toBe(false);
    expect(tracked(ANALYTICS_EVENTS.LEVEL_UP)[0][1]).toMatchObject({
      level: 4,
      previous_level: 3,
      retroactive: true,
    });
    expect(tracked(ANALYTICS_EVENTS.STREAK_MILESTONE_REACHED)[0][1]).toMatchObject({
      days: 7,
      retroactive: true,
    });
  });

  it("reports no level-up when the level did not move", () => {
    const { dispatch } = collect();
    applyRefreshUi(makeRefresh({ level: 3 }), dispatch, { level: 3, constance: 7 });

    expect(tracked(ANALYTICS_EVENTS.LEVEL_UP)).toHaveLength(0);
  });
});
