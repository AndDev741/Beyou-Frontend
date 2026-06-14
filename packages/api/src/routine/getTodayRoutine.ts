import { TFunction } from 'i18next';
import { getHttpClient, ApiError } from '../httpClient';
import { Routine } from '@beyou/types/routine/routine';
import { getLogger } from '../logger';

type apiResponse = Record<string, Routine | string>

async function getTodayRoutine(t: TFunction): Promise<apiResponse>{
    try{
        const response = await getHttpClient().get<Routine>(`/routine/today`);
        return {success: response.data};
    }catch(e){
        if(e instanceof ApiError){
            getLogger().error(e);
        }
        return {error: t('UnexpectedError')};
    }
}

export default getTodayRoutine;