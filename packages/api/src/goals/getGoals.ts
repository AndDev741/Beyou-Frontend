import { TFunction } from 'i18next';
import { goal } from '@beyou/types/goals/goalType';
import { getHttpClient, ApiError } from '../httpClient';
import { getLogger } from '../logger';

type apiResponse = Record<string, goal[] | string>;

async function getGoals(t: TFunction): Promise<apiResponse> {
  try {
    const response = await getHttpClient().get<goal[]>(`/goal`);
    return { success: response.data };
  } catch (e) {
    if (e instanceof ApiError) {
      getLogger().error(e);
    }
    return { error: t('UnexpectedError') };
  }
}

export default getGoals;