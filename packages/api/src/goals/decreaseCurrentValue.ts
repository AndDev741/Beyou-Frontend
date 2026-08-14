import { TFunction } from "i18next";
import { getHttpClient, ApiError } from '../httpClient';
import { goal } from "@beyou/types/goals/goalType";
import { getLogger } from "../logger";

/**
 * Takes away from a goal's progress, never below zero (the backend floors it).
 * `amount` defaults to 1, matching the card's - button.
 */
async function decreaseCurrentValue(id: string, t: TFunction, amount: number = 1): Promise<goal> {
  try {
    const response = await getHttpClient().put<goal>(`/goal/decrease`, { goalId: id, value: amount }, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (e) {
    if (e instanceof ApiError) {
      getLogger().error(e);
    }
    throw new Error(t('UnexpectedError') + e);
  }
}

export default decreaseCurrentValue;
