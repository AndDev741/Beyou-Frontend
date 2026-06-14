import { TFunction } from 'i18next';
import { getHttpClient } from '../httpClient';
import { ApiErrorPayload, parseApiError } from '../apiError';
import { getLogger } from '../logger';

type apiResponse = Promise<{ success?: unknown; error?: ApiErrorPayload; validation?: string }>;

async function createTask(
  name: string,
  description: string,
  iconId: string,
  categoriesId: string[],
  t: TFunction,
  importance?: number,
  difficulty?: number,
  oneTimeTask: boolean = false,
): apiResponse {
  const taskData = {
    name: name,
    description: description,
    iconId: iconId,
    importance: importance,
    difficulty: difficulty,
    categoriesId: categoriesId,
    oneTimeTask: oneTimeTask,
  };

  try {
    const response = await getHttpClient().post("/task", taskData);
    return response.data as { success?: unknown; error?: ApiErrorPayload; validation?: string };
  } catch (e) {
    getLogger().error(e);
    const parsed = parseApiError(e);
    return { error: parsed ?? { message: t('UnexpectedError') } };
  }
}

export default createTask;
