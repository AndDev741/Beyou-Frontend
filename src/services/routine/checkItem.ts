import { TFunction } from 'i18next';
import axiosWithCredentials from '../axiosConfig';
import axios from 'axios';
import { itemGroupToCheck } from '../../types/routine/itemGroupToCheck';
import { RefreshUI } from '../../types/refreshUi/refreshUi.type';

type apiResponse = Record<string, RefreshUI | string>

async function checkRoutine(groupDto: itemGroupToCheck, t: TFunction, date?: string): Promise<apiResponse>{
    try{
        const payload = date ? { ...groupDto, date } : groupDto;
        const response = await axiosWithCredentials.post<RefreshUI>(`/routine/check`, payload);
        return {success: response.data};
    }catch(e){
        if(axios.isAxiosError(e)){
            console.error(e);
        }
        return {error: t('UnexpectedError')};
    }
}

export default checkRoutine;
