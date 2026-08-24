import type { Dispatch } from "@reduxjs/toolkit";
import { RefreshUI } from "@beyou/types/refreshUi/refreshUi.type";
import {
  actualLevelXpEnter,
  alreadyIncreaseConstanceTodayEnter,
  checkRecorded,
  constanceDormantEnter,
  constanceEnter,
  levelEnter,
  maxConstanceEnter,
  nextLevelXpEnter,
  xpEnter,
} from "./perfilSlice";
import { refreshCategorie } from "../category/categoriesSlice";
import { refreshHabit } from "../habit/habitsSlice";
import { refreshItemGroup } from "../routine/todayRoutineSlice";
import { celebrationPushed } from "../celebration/celebrationSlice";
import { STREAK_MILESTONES } from "../gamification/streakMilestones";
import { ANALYTICS_EVENTS, getAnalytics } from "@beyou/api";

export type ApplyRefreshUiOptions = { skipCelebrations?: boolean };

/** The previous gamification state read BEFORE applying the refresh. */
export type PreviousProgress = { level: number; constance: number };

/**
 * Applies a backend `RefreshUI` payload to the store: updates the perfil
 * (xp/level/constance/...), refreshes touched categories and the checked item
 * group, and queues level-up / streak-milestone celebrations.
 *
 * This is a pure orchestration function (not a redux-thunk) so it works with a
 * plain `dispatch` on both web and React Native without ThunkDispatch typing,
 * and is trivially unit-testable with a fake dispatch. The caller reads
 * `previous` from the store BEFORE calling so the celebration diff is correct.
 *
 * Extracted from apps/web/src/hooks/useUiRefresh.tsx — behavior preserved.
 */
export function applyRefreshUi(
  refreshUi: RefreshUI | null | undefined,
  dispatch: Dispatch,
  previous: PreviousProgress,
  options: ApplyRefreshUiOptions = {},
): void {
  if (!refreshUi) return;

  // A check the user is filling in for an earlier day, rather than for today. It is the
  // same flag the celebrations ride on — a retroactive check is not a moment to throw
  // confetti — and it is exactly the distinction the XP-decay nudge needs, so it travels
  // with the events too instead of being inferred from a timestamp later.
  const retroactive = Boolean(options.skipCelebrations);

  if (refreshUi.refreshUser) {
    const refreshUser = refreshUi.refreshUser;

    const leveledUp = refreshUser.level > previous.level;
    if (!options.skipCelebrations && leveledUp) {
      dispatch(celebrationPushed({ kind: "levelUp", level: refreshUser.level }));
    }

    const milestone = STREAK_MILESTONES.find(
      (m) => previous.constance < m && refreshUser.currentConstance >= m,
    );
    if (!options.skipCelebrations && milestone) {
      dispatch(celebrationPushed({ kind: "streakMilestone", days: milestone }));
    }

    // The analytics events are NOT gated on skipCelebrations, unlike the two
    // dispatches above. Suppressing confetti for a backfilled day is a UI decision;
    // the level really did go up and the streak really did cross the milestone, and an
    // engagement funnel that dropped those would under-count exactly the retroactive
    // path the XP-decay nudge is meant to drive.
    if (leveledUp) {
      getAnalytics().track(ANALYTICS_EVENTS.LEVEL_UP, {
        level: refreshUser.level,
        previous_level: previous.level,
        retroactive,
      });
    }
    if (milestone) {
      getAnalytics().track(ANALYTICS_EVENTS.STREAK_MILESTONE_REACHED, {
        days: milestone,
        streak_current: refreshUser.currentConstance,
        streak_best: refreshUser.maxConstance,
        retroactive,
      });
    }

    dispatch(xpEnter(refreshUser.xp));
    dispatch(levelEnter(refreshUser.level));
    dispatch(constanceEnter(refreshUser.currentConstance));
    dispatch(maxConstanceEnter(refreshUser.maxConstance));
    dispatch(alreadyIncreaseConstanceTodayEnter(refreshUser.alreadyIncreaseConstanceToday));
    dispatch(nextLevelXpEnter(refreshUser.nextLevelXp));
    dispatch(actualLevelXpEnter(refreshUser.actualLevelXp));
    // The refresh payload has no dormancy flag, and does not need one: a run cannot
    // be dormant in the same request that just checked something off. Clearing it
    // here keeps a "paused" label from surviving the check that resumed the run.
    dispatch(constanceDormantEnter(false));
  }

  if (refreshUi.refreshCategories && refreshUi.refreshCategories.length > 0) {
    refreshUi.refreshCategories.forEach((refreshCat) => {
      dispatch(refreshCategorie(refreshCat));
    });
  }

  // The habit's own numbers, streak included, so its card repaints from this
  // response rather than the next GET /habit — which is the moment the streak
  // matters most.
  if (refreshUi.refreshHabit) {
    dispatch(refreshHabit(refreshUi.refreshHabit));
  }

  if (refreshUi.refreshItemChecked) {
    dispatch(refreshItemGroup(refreshUi.refreshItemChecked));
  }

  // A response that carried something is a check as far as a day strip is
  // concerned: the strips fetch once on mount, so without this tick today's square
  // stays drawn as still-open while the number beside it has already moved. Any
  // field counts rather than only an item check — a spurious refetch of 28 days is
  // cheaper than a strip that lies, and identical in-flight queries are shared. A
  // payload that refreshed nothing ticks nothing.
  const refreshedSomething = Boolean(
    refreshUi.refreshUser ||
      refreshUi.refreshHabit ||
      refreshUi.refreshItemChecked ||
      refreshUi.refreshCategories?.length,
  );
  if (refreshedSomething) {
    dispatch(checkRecorded());
  }

  // `check_recorded` is the atom the whole engagement funnel is built on, and this is the
  // one function both platforms pipe every accepted check through — so it is tracked here
  // rather than at the API call, where web and mobile would each need their own call.
  //
  // The condition is narrower than `refreshedSomething` above on purpose. Goal actions
  // (`useGoalActions` → PUT /goal/complete|increase) also come through here and also
  // refresh the perfil and categories, but no item was checked off a routine; counting
  // them as check-ins would inflate every completion rate. An item check always carries
  // `refreshItemChecked`, and a habit checked outside a routine carries `refreshHabit`,
  // so those two together are the honest test. Goals report themselves through
  // `goal_completed`.
  const itemChecked = refreshUi.refreshItemChecked;
  if (itemChecked || refreshUi.refreshHabit) {
    getAnalytics().track(ANALYTICS_EVENTS.CHECK_RECORDED, {
      retroactive,
      // A skip is a deliberate "not today" rather than a completion. Both keep a streak
      // alive, and a nudge that cannot tell them apart would read a week of skips as a
      // week of progress.
      skipped: Boolean(itemChecked?.check?.skipped),
      // Zero when the check earned nothing — which is itself the signal that the XP decay
      // window had already closed on that day.
      xp_generated: itemChecked?.check?.xpGenerated ?? 0,
      owner: itemChecked ? "routine_item" : "habit",
    });
  }
}
