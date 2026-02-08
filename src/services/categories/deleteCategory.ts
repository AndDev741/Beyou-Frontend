import axiosWithCredentials from '../axiosConfig';
import axios from 'axios';
import { TFunction } from 'i18next';
import { ApiErrorPayload, parseApiError } from '../apiError';

type apiResponse = {
    success?: unknown;
    error?: ApiErrorPayload;
}

async function deleteCategory(categoryId: string, t:TFunction): Promise<apiResponse>{
    try{
        const response = await axiosWithCredentials.delete<apiResponse>(`/category/${categoryId}`);
        return response.data;
    }catch(e){
        if(axios.isAxiosError(e)){
            console.error(e);
            return { error: parseApiError(e) };
        }
        return {error: { message: t('UnexpectedError') }};
    }
}

export default deleteCategory;
