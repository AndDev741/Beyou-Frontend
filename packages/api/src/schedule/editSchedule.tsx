import { TFunction } from 'i18next';
import { getHttpClient } from '../httpClient';
import { ApiErrorPayload, parseApiError } from '../apiError';
import { getLogger } from '../logger';

type apiResponse = Promise<{ success?: unknown; error?: ApiErrorPayload; validation?: string }>;

async function editSchedule(scheduleId: string, days: string[], routineId: string, t: TFunction): apiResponse {
    const scheduleData = {
        scheduleId: scheduleId,
        routineId: routineId,
        days: days
    };

    try {
        const response = await getHttpClient().put(`/schedule`, scheduleData);
        return response.data as { success?: unknown; error?: ApiErrorPayload; validation?: string };
    } catch (e) {
        getLogger().error(e);
        const parsed = parseApiError(e);
        return { error: parsed ?? { message: t('UnexpectedError') } };
    }
}

export default editSchedule;
