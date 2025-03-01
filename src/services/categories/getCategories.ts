import axiosWithCredentials from '../axiosConfig';
import axios from 'axios';
import { TFunction } from 'i18next';
import categoryType from "../../types/category/categoryType";


type apiResponse = Record<string, Array<categoryType> | string>;

async function getCategories(userId: string, t:TFunction): Promise<apiResponse> {
    try{
        const response = await axiosWithCredentials.get<Array<categoryType>>(`/category/${userId}`);
        return {success: response.data};
    }catch(e){
        if(axios.isAxiosError(e)){
            console.error(e);
            switch(e.response?.data.error){
                case "User Not Found":
                    return {error: t('User Not Found')};
                default:
                    return {error: t('UnexpectedError')}
            }
        }
        return {error: t('UnexpectedError')};
    }
}

export default getCategories