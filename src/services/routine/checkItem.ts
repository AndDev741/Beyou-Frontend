import { TFunction } from 'i18next';
import axiosWithCredentials from '../axiosConfig';
import axios from 'axios';
import { Routine } from '../../types/routine/routine';
import { itemGroupToCheck } from '../../types/routine/itemGroupToCheck';

type apiResponse = Record<string, Routine | string>

async function checkRoutine(groupDto: itemGroupToCheck, t: TFunction, date?: string): Promise<apiResponse>{
    try{
        const payload = date ? { ...groupDto, date } : groupDto;
        const response = await axiosWithCredentials.post<Routine>(`/routine/check`, payload);
        return {success: response.data};
    }catch(e){
        if(axios.isAxiosError(e)){
            console.error(e);
        }
        return {error: t('UnexpectedError')};
    }
}

export default checkRoutine;
