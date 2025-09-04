import { TFunction } from "i18next";
import axiosWithCredentials from '../axiosConfig';
import axios from 'axios';
import { goal } from "../../types/goals/goalType";

type apiResponse = Record<string, string>;

async function markGoalAsComplete(id: string, t: TFunction): Promise<apiResponse> {
  try {
    const response = await axiosWithCredentials.put<string>(`/goal/complete`, id, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return { success: response.data };
  } catch (e) {
    if (axios.isAxiosError(e)) {
      console.error(e);
    }
    return { error: t('UnexpectedError') };
  }
}

export default markGoalAsComplete;