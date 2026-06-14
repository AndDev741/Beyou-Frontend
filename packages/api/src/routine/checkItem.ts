import { TFunction } from 'i18next';
import { getHttpClient, ApiError } from '../httpClient';
import { itemGroupToCheck } from '@beyou/types/routine/itemGroupToCheck';
import { RefreshUI } from '@beyou/types/refreshUi/refreshUi.type';
import { ApiErrorPayload, parseApiError } from '../apiError';
import { getLogger } from '../logger';

type apiResponse = { success?: RefreshUI; error?: ApiErrorPayload }

async function checkRoutine(groupDto: itemGroupToCheck, t: TFunction, date?: string): Promise<apiResponse>{
    try{
        const payload = date ? { ...groupDto, date } : groupDto;
        const response = await getHttpClient().post<RefreshUI>(`/routine/check`, payload);
        return {success: response.data};
    }catch(e){
        if(e instanceof ApiError){
            getLogger().error(e);
            return { error: parseApiError(e) };
        }
        return {error: { message: t('UnexpectedError') }};
    }
}

export default checkRoutine;
