import { TFunction } from "i18next";
import { getHttpClient, ApiError } from '../httpClient';
import { RefreshUI } from "@beyou/types/refreshUi/refreshUi.type";

type apiResponse = { success?: RefreshUI; error?: string };

async function markGoalAsComplete(id: string, t: TFunction): Promise<apiResponse> {
  try {
    const response = await getHttpClient().put<RefreshUI>(`/goal/complete`, id, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return { success: response.data };
  } catch (e) {
    if (e instanceof ApiError) {
      console.error(e);
    }
    return { error: t('UnexpectedError') };
  }
}

export default markGoalAsComplete;