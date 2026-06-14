import { TFunction } from 'i18next';
import { getHttpClient, ApiError } from '../httpClient';
import { Routine } from '@beyou/types/routine/routine';

type apiResponse = Record<string, Routine[] | string>

async function getRoutines(t: TFunction): Promise<apiResponse>{
    try{
        const response = await getHttpClient().get<Routine[]>(`/routine`);
        return {success: response.data};
    }catch(e){
        if(e instanceof ApiError){
            console.error(e);
        }
        return {error: t('UnexpectedError')};
    }
}

export default getRoutines;