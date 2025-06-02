import { TFunction } from 'i18next';
import { schedule } from '../../types/schedule/schedule';
import axiosWithCredentials from '../axiosConfig';
import axios from 'axios';

type apiResponse = Record<string, schedule[] | string>

async function getSchedules(t: TFunction): Promise<apiResponse>{
    try{
        const response = await axiosWithCredentials.get<schedule[]>(`/schedule`);
        return {success: response.data};
    }catch(e){
        if(axios.isAxiosError(e)){
            console.error(e);
        }
        return {error: t('UnexpectedError')};
    }
}

export default getSchedules;