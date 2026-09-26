import { TFunction } from 'i18next';
import { goal } from '@beyou/types/goals/goalType';
import { getHttpClient } from '../httpClient';
import { ApiErrorPayload, parseApiError } from '../apiError';
import { getLogger } from '../logger';

/**
 * Archives a goal (put away, not deleted) or restores it, `PUT /goal/archive`.
 *
 * Sends the state wanted rather than asking for a toggle, so a double tap cannot archive and
 * restore in one go. The server archives the sub-goals along with it and, on restore, brings
 * back exactly the ones archived together; `success` is every goal whose state changed.
 */
export default async function archiveGoal(
  goalId: string,
  archived: boolean,
  _t: TFunction
): Promise<{ success?: goal[]; error?: ApiErrorPayload }> {
  try {
    const response = await getHttpClient().put<goal[]>('/goal/archive', { goalId, archived });
    return { success: response.data };
  } catch (e) {
    getLogger().error(e);
    return { error: parseApiError(e) };
  }
}
