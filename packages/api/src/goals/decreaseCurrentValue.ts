import { TFunction } from "i18next";
import { getHttpClient, ApiError } from '../httpClient';
import { goal } from "@beyou/types/goals/goalType";
import { getLogger } from "../logger";


async function decreaseCurrentValue(id: string, t: TFunction): Promise<goal> {
  try {
    const response = await getHttpClient().put<goal>(`/goal/decrease`, id, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (e) {
    if (e instanceof ApiError) {
      getLogger().error(e);
    }
    throw new Error(`${t('UnexpectedError')}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export default decreaseCurrentValue;