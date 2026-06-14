import { TFunction } from "i18next";
import { getHttpClient, ApiError } from '../httpClient';
import { goal } from "@beyou/types/goals/goalType";

async function increaseCurrentValue(id: string, t: TFunction): Promise<goal> {
  try {
    const response = await getHttpClient().put<goal>(`/goal/increase`, id, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (e) {
    if (e instanceof ApiError) {
      console.error(e);
    }
    throw new Error(t('UnexpectedError') + e);
  }
}

export default increaseCurrentValue;