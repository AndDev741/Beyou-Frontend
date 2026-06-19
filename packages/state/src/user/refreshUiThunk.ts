import type { Dispatch } from "@reduxjs/toolkit";
import { RefreshUI } from "@beyou/types/refreshUi/refreshUi.type";
import {
  actualLevelXpEnter,
  alreadyIncreaseConstanceTodayEnter,
  constanceEnter,
  levelEnter,
  maxConstanceEnter,
  nextLevelXpEnter,
  xpEnter,
} from "./perfilSlice";
import { refreshCategorie } from "../category/categoriesSlice";
import { refreshItemGroup } from "../routine/todayRoutineSlice";
import { celebrationPushed } from "../celebration/celebrationSlice";
import { STREAK_MILESTONES } from "../gamification/streakMilestones";

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

  if (refreshUi.refreshUser) {
    const refreshUser = refreshUi.refreshUser;

    if (!options.skipCelebrations && refreshUser.level > previous.level) {
      dispatch(celebrationPushed({ kind: "levelUp", level: refreshUser.level }));
    }

    const milestone = STREAK_MILESTONES.find(
      (m) => previous.constance < m && refreshUser.currentConstance >= m,
    );
    if (!options.skipCelebrations && milestone) {
      dispatch(celebrationPushed({ kind: "streakMilestone", days: milestone }));
    }

    dispatch(xpEnter(refreshUser.xp));
    dispatch(levelEnter(refreshUser.level));
    dispatch(constanceEnter(refreshUser.currentConstance));
    dispatch(maxConstanceEnter(refreshUser.maxConstance));
    dispatch(alreadyIncreaseConstanceTodayEnter(refreshUser.alreadyIncreaseConstanceToday));
    dispatch(nextLevelXpEnter(refreshUser.nextLevelXp));
    dispatch(actualLevelXpEnter(refreshUser.actualLevelXp));
  }

  if (refreshUi.refreshCategories && refreshUi.refreshCategories.length > 0) {
    refreshUi.refreshCategories.forEach((refreshCat) => {
      dispatch(refreshCategorie(refreshCat));
    });
  }

  if (refreshUi.refreshItemChecked) {
    dispatch(refreshItemGroup(refreshUi.refreshItemChecked));
  }
}
