import { TFunction } from 'i18next';
import { getHttpClient, ApiError } from '../httpClient';
import categoryType from "@beyou/types/category/categoryType";


type apiResponse = Record<string, Array<categoryType> | string>;

async function getCategories(t:TFunction): Promise<apiResponse> {
    try{
        const response = await getHttpClient().get<Array<categoryType>>(`/category`);
        return {success: response.data};
    }catch(e){
        if(e instanceof ApiError){
            console.error(e);
            const errorMsg = (e.data as Record<string, unknown> | undefined)?.error;
            switch(errorMsg){
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