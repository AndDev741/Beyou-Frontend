import axiosWithCredentials from '../axiosConfig';
import axios from 'axios';
import { TFunction } from 'i18next';

type apiResponse = Record<string, string>

async function deleteCategory(categoryId: string, t:TFunction): Promise<apiResponse>{
    try{
        const response = await axiosWithCredentials.delete<apiResponse>(`/category/${categoryId}`);
        return response.data;
    }catch(e){
        if(axios.isAxiosError(e)){
            console.error(e);
            return e.response?.data || t('UnexpectedError');
        }
        return {error: t('UnexpectedError')};
    }
}

export default deleteCategory;