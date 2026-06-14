import { TFunction } from 'i18next';
import { getHttpClient } from '../httpClient';
import { ApiErrorPayload, parseApiError } from '../apiError';
import { getLogger } from '../logger';

type apiResponse = Promise<{ success?: unknown; error?: ApiErrorPayload; validation?: string }>;

async function editTask(
    taskId: string,
    name: string,
    description: string,
    iconId: string,
    importance: number,
    difficulty: number,
    categoriesId: string[],
    oneTimeTask: boolean,
    t: TFunction
): apiResponse {
    const taskData = {
        taskId: taskId,
        name: name,
        description: description,
        iconId: iconId,
        importance: importance,
        difficulty: difficulty,
        categoriesId: categoriesId,
        oneTimeTask: oneTimeTask,
    };

    try {
        const response = await getHttpClient().put(`/task`, taskData);
        return response.data as { success?: unknown; error?: ApiErrorPayload; validation?: string };
    } catch (e) {
        getLogger().error(e);
        const parsed = parseApiError(e);
        return { error: parsed ?? { message: t('UnexpectedError') } };
    }
}

export default editTask;
