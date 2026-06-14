import { TFunction } from 'i18next';
import { getHttpClient, ApiError } from '../httpClient';
import { ApiErrorPayload, parseApiError } from '../apiError';

type apiResponse = {
    success?: unknown;
    error?: ApiErrorPayload;
}

async function deleteCategory(categoryId: string, t:TFunction): Promise<apiResponse>{
    try{
        const response = await getHttpClient().delete<apiResponse>(`/category/${categoryId}`);
        return response.data;
    }catch(e){
        if(e instanceof ApiError){
            console.error(e);
            return { error: parseApiError(e) };
        }
        return {error: { message: t('UnexpectedError') }};
    }
}

export default deleteCategory;
