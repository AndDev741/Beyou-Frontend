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
            switch(e.response?.data.error){
                case "Category not found":
                    return {error: t('Category not found')};
                case "Error trying to delete the category":
                    return {error: t('Error trying to delete the category')};
                case "This category is used in some habit, please delete it first":
                    return {error: t('This category is used in some habit, please delete it first')}
                default:
                    return {error: t('UnexpectedError')}
            }
        }
        return {error: t('UnexpectedError')};
    }
}

export default deleteCategory;