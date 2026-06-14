import { TFunction } from 'i18next';
import { getHttpClient } from '../httpClient';
import { Routine } from '@beyou/types/routine/routine';
import { ApiErrorPayload, parseApiError } from '../apiError';
import { buildRoutinePayload } from './routinePayload';
import { getLogger } from '../logger';

type apiResponse = Promise<{ success?: unknown; error?: ApiErrorPayload; validation?: string }>;

async function createRoutine(routine: Routine, t: TFunction): apiResponse {
    try {
        const response = await getHttpClient().post("/routine", buildRoutinePayload(routine, { includeSectionIds: false, includeGroupIds: false }));
        return response.data as { success?: unknown; error?: ApiErrorPayload; validation?: string };
    } catch (e) {
        getLogger().error(e);
        const parsed = parseApiError(e);
        return { error: parsed ?? { message: t('UnexpectedError') } };
    }
}

export default createRoutine;
