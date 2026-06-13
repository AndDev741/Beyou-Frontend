import { TFunction } from 'i18next';
import axiosWithCredentials from '../axiosConfig';
import { ApiErrorPayload, parseApiError } from '../apiError';

export default async function deleteGoal(
  goalId: string,
  t: TFunction
): Promise<{ success?: unknown; error?: ApiErrorPayload; }> {
  try {
    const response = await axiosWithCredentials.delete(`/goal/${goalId}`);
    return response.data;
  } catch (e) {
    console.error(e);
    return { error: parseApiError(e) };
  }
}
