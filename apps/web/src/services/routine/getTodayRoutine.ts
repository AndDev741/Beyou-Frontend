import { TFunction } from 'i18next';
import axiosWithCredentials from '../axiosConfig';
import axios from 'axios';
import { Routine } from '../../types/routine/routine';

type apiResponse = Record<string, Routine | string>

async function getTodayRoutine(t: TFunction): Promise<apiResponse>{
    try{
        const response = await axiosWithCredentials.get<Routine>(`/routine/today`);
        return {success: response.data};
    }catch(e){
        if(axios.isAxiosError(e)){
            console.error(e);
        }
        return {error: t('UnexpectedError')};
    }
}

export default getTodayRoutine;