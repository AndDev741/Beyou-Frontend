import { TFunction } from 'i18next';
import { task } from '@beyou/types/tasks/taskType';
import { getHttpClient, ApiError } from '../httpClient';
import { getLogger } from '../logger';

type apiResponse = Record<string, task[] | string>

async function getTasks(t: TFunction): Promise<apiResponse>{
    try{
        const response = await getHttpClient().get<task[]>(`/task`);
        return {success: response.data};
    }catch(e){
        if(e instanceof ApiError){
            getLogger().error(e);
        }
        return {error: t('UnexpectedError')};
    }
}

export default getTasks;