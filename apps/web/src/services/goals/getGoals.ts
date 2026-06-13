import { TFunction } from 'i18next';
import { goal } from '../../types/goals/goalType';
import axiosWithCredentials from '../axiosConfig';
import axios from 'axios';

type apiResponse = Record<string, goal[] | string>;

async function getGoals(t: TFunction): Promise<apiResponse> {
  try {
    const response = await axiosWithCredentials.get<goal[]>(`/goal`);
    return { success: response.data };
  } catch (e) {
    if (axios.isAxiosError(e)) {
      console.error(e);
    }
    return { error: t('UnexpectedError') };
  }
}

export default getGoals;