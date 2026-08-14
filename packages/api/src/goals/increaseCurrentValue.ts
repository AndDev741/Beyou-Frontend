import { TFunction } from "i18next";
import { getHttpClient, ApiError } from '../httpClient';
import { goal } from "@beyou/types/goals/goalType";
import { getLogger } from "../logger";

/**
 * Adds to a goal's progress. `amount` defaults to 1, which is what the card's +
 * button sends; the progress modal passes whatever the user typed.
 */
async function increaseCurrentValue(id: string, t: TFunction, amount: number = 1): Promise<goal> {
  try {
    const response = await getHttpClient().put<goal>(`/goal/increase`, { goalId: id, value: amount }, {
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

export default increaseCurrentValue;
