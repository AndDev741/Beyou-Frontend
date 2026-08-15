import { TFunction } from 'i18next';
import { getHttpClient, ApiError } from '../httpClient';
import type { XpHistory } from '@beyou/types/xp/xpHistory';
import { getLogger } from '../logger';

type ApiResponse = { success?: XpHistory; error?: string };

/**
 * One user's XP per day, every entity at once.
 *
 * One request rather than one per widget: the dashboard's best and worst area, and
 * every card on the categories page, are all reading the same window.
 */
async function getXpHistory(t: TFunction, days = 7): Promise<ApiResponse> {
  try {
    const response = await getHttpClient().get<XpHistory>(`/xp/history?days=${days}`);
    return { success: response.data };
  } catch (e) {
    if (e instanceof ApiError) {
      getLogger().error(e);
    }
    return { error: t('UnexpectedError') };
  }
}

export default getXpHistory;
