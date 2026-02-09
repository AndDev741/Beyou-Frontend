import { TFunction } from 'i18next';
import axios from '../axiosConfig';
import { Routine } from '../../types/routine/routine';
import { ApiErrorPayload, parseApiError } from '../apiError';
import { buildRoutinePayload } from './routinePayload';

type apiResponse = Promise<{ success?: unknown; error?: ApiErrorPayload; validation?: string }>;

async function editRoutine(routine: Routine, t: TFunction): apiResponse {
    try {
        const response = await axios.put(
            `/routine/${routine.id}`,
            buildRoutinePayload(routine, { includeSectionIds: true, includeGroupIds: true })
        );
        return response.data;
    } catch (e) {
        console.error(e);
        const parsed = parseApiError(e);
        return { error: parsed ?? { message: t('UnexpectedError') } };
    }
}

export default editRoutine;
