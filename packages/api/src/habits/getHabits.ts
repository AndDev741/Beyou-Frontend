import { TFunction } from 'i18next';
import { habit } from '@beyou/types/habit/habitType';
import { getHttpClient, ApiError } from '../httpClient';

type apiResponse = Record<string, habit[] | string>

async function getHabits(t: TFunction): Promise<apiResponse>{
    try{
        const response = await getHttpClient().get<habit[]>(`/habit`);
        return {success: response.data};
    }catch(e){
        if(e instanceof ApiError){
            console.error(e);
        }
        return {error: t('UnexpectedError')};
    }
}

export default getHabits;