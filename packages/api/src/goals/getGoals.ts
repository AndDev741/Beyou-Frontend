import { TFunction } from 'i18next';
import { goal } from '@beyou/types/goals/goalType';
import { getHttpClient, ApiError } from '../httpClient';

type apiResponse = Record<string, goal[] | string>;

async function getGoals(t: TFunction): Promise<apiResponse> {
  try {
    const response = await getHttpClient().get<goal[]>(`/goal`);
    return { success: response.data };
  } catch (e) {
    if (e instanceof ApiError) {
      console.error(e);
    }
    return { error: t('UnexpectedError') };
  }
}

export default getGoals;