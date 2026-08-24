import { TFunction } from "i18next";
import { getHttpClient, ApiError } from '../httpClient';
import { RefreshUI } from "@beyou/types/refreshUi/refreshUi.type";
import { getLogger } from "../logger";
import { ANALYTICS_EVENTS } from "../analyticsEvents";
import { getAnalytics } from "../analytics";

type apiResponse = { success?: RefreshUI; error?: string };

async function markGoalAsComplete(id: string, t: TFunction): Promise<apiResponse> {
  try {
    const response = await getHttpClient().put<RefreshUI>(`/goal/complete`, id, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    // Goals are the only item with a completion of their own, and this endpoint is the
    // only path that flips it (see the backend note on `checkGoal` being the sole writer
    // of completion). No properties: everything that identifies the goal is user-written.
    getAnalytics().track(ANALYTICS_EVENTS.GOAL_COMPLETED);
    return { success: response.data };
  } catch (e) {
    if (e instanceof ApiError) {
      getLogger().error(e);
    }
    return { error: t('UnexpectedError') };
  }
}

export default markGoalAsComplete;