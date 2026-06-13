import { TFunction } from 'i18next';
import { habit } from '../../types/habit/habitType';
import axiosWithCredentials from '../axiosConfig';
import axios from 'axios';

type apiResponse = Record<string, habit[] | string>

async function getHabits(t: TFunction): Promise<apiResponse>{
    try{
        const response = await axiosWithCredentials.get<habit[]>(`/habit`);
        return {success: response.data};
    }catch(e){
        if(axios.isAxiosError(e)){
            console.error(e);
        }
        return {error: t('UnexpectedError')};
    }
}

export default getHabits;