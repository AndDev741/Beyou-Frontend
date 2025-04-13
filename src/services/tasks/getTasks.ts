import { TFunction } from 'i18next';
import { task } from '../../types/tasks/taskType';
import axiosWithCredentials from '../axiosConfig';
import axios from 'axios';

type apiResponse = Record<string, task[] | string>

async function getTasks(t: TFunction): Promise<apiResponse>{
    try{
        const response = await axiosWithCredentials.get<task[]>(`/task`);
        return {success: response.data};
    }catch(e){
        if(axios.isAxiosError(e)){
            console.error(e);
        }
        return {error: t('UnexpectedError')};
    }
}

export default getTasks;