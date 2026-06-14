import { TFunction } from 'i18next';
import { getHttpClient } from '../httpClient';
import { ApiErrorPayload, parseApiError } from '../apiError';

type apiResponse = Promise<{ success?: unknown; error?: ApiErrorPayload; validation?: string }>;

async function createSchedule(days: string[], routineId: string, t: TFunction): apiResponse {
    const scheduleData = {
        routineId: routineId,
        days: days
    };

    try {
        const response = await getHttpClient().post("/schedule", scheduleData);
        return response.data as { success?: unknown; error?: ApiErrorPayload; validation?: string };
    } catch (e) {
        console.error(e);
        const parsed = parseApiError(e);
        return { error: parsed ?? { message: t('UnexpectedError') } };
    }
}

export default createSchedule;
