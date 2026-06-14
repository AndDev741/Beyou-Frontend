import { TFunction } from 'i18next';
import { schedule } from '@beyou/types/schedule/schedule';
import { getHttpClient, ApiError } from '../httpClient';
import { getLogger } from '../logger';

type apiResponse = Record<string, schedule[] | string>

async function getSchedules(t: TFunction): Promise<apiResponse>{
    try{
        const response = await getHttpClient().get<schedule[]>(`/schedule`);
        return {success: response.data};
    }catch(e){
        if(e instanceof ApiError){
            getLogger().error(e);
        }
        return {error: t('UnexpectedError')};
    }
}

export default getSchedules;