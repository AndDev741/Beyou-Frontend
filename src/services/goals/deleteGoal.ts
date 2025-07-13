import { TFunction } from 'i18next';
import axiosWithCredentials from '../axiosConfig';

export default async function deleteGoal(
  goalId: string,
  t: TFunction
): Promise<Record<string, string>> {
  try {
    const response = await axiosWithCredentials.delete<Record<string, string>>(`/goal/${goalId}`);
    return response.data;
  } catch (e) {
    console.error(e);
    return { error: t('UnexpectedError') };
  }
}