import { TFunction } from "i18next";
import axiosWithCredentials from '../axiosConfig';
import axios from 'axios';
import { goal } from "../../types/goals/goalType";


async function decreaseCurrentValue(id: string, t: TFunction): Promise<goal> {
  try {
    const response = await axiosWithCredentials.put<goal>(`/goal/decrease`, id, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      console.error(e);
    }
    throw new Error(t('UnexpectedError') + e);
  }
}

export default decreaseCurrentValue;