import { TFunction } from 'i18next';
import axios from '../axiosConfig';
import { ApiErrorPayload, parseApiError } from '../apiError';

type apiResponse = Promise<{ success?: unknown; error?: ApiErrorPayload; validation?: string }>;

async function editSchedule(scheduleId: string, days: string[], routineId: string, t: TFunction): apiResponse {
    const scheduleData = {
        scheduleId: scheduleId,
        routineId: routineId,
        days: days
    };

    try {
        const response = await axios.put(`/schedule`, scheduleData);
        return response.data;
    } catch (e) {
        console.error(e);
        const parsed = parseApiError(e);
        return { error: parsed ?? { message: t('UnexpectedError') } };
    }
}

export default editSchedule;
