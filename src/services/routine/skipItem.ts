import { TFunction } from 'i18next';
import axiosWithCredentials from '../axiosConfig';
import axios from 'axios';
import { itemGroupToSkip } from '../../types/routine/itemGroupToSkip';
import { RefreshUI } from '../../types/refreshUi/refreshUi.type';

type apiResponse = Record<string, RefreshUI | string>

async function skipRoutine(groupDto: itemGroupToSkip, t: TFunction, date?: string): Promise<apiResponse>{
    try{
        const payload = date ? { ...groupDto, date } : groupDto;
        const response = await axiosWithCredentials.post<RefreshUI>(`/routine/skip`, payload);
        return {success: response.data};
    }catch(e){
        if(axios.isAxiosError(e)){
            console.error(e);
        }
        return {error: t('UnexpectedError')};
    }
}

export default skipRoutine;
