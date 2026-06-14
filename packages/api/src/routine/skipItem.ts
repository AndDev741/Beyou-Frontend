import { TFunction } from 'i18next';
import { getHttpClient, ApiError } from '../httpClient';
import { itemGroupToSkip } from '@beyou/types/routine/itemGroupToSkip';
import { RefreshUI } from '@beyou/types/refreshUi/refreshUi.type';
import { ApiErrorPayload, parseApiError } from '../apiError';

type apiResponse = { success?: RefreshUI; error?: ApiErrorPayload }

async function skipRoutine(groupDto: itemGroupToSkip, t: TFunction, date?: string): Promise<apiResponse>{
    try{
        const payload = date ? { ...groupDto, date } : groupDto;
        const response = await getHttpClient().post<RefreshUI>(`/routine/skip`, payload);
        return {success: response.data};
    }catch(e){
        if(e instanceof ApiError){
            console.error(e);
            return { error: parseApiError(e) };
        }
        return {error: { message: t('UnexpectedError') }};
    }
}

export default skipRoutine;
