import { TFunction } from 'i18next';
import axiosWithCredentials from '../axiosConfig';
import axios from 'axios';
import { itemGroupToCheck } from '../../types/routine/itemGroupToCheck';
import { RefreshUI } from '../../types/refreshUi/refreshUi.type';
import { ApiErrorPayload, parseApiError } from '../apiError';

type apiResponse = { success?: RefreshUI; error?: ApiErrorPayload }

async function checkRoutine(groupDto: itemGroupToCheck, t: TFunction, date?: string): Promise<apiResponse>{
    try{
        const payload = date ? { ...groupDto, date } : groupDto;
        const response = await axiosWithCredentials.post<RefreshUI>(`/routine/check`, payload);
        return {success: response.data};
    }catch(e){
        if(axios.isAxiosError(e)){
            console.error(e);
            return { error: parseApiError(e) };
        }
        return {error: { message: t('UnexpectedError') }};
    }
}

export default checkRoutine;
