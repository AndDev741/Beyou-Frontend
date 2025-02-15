import axiosWithCredentials from '../axiosConfig';
import axios from 'axios';
import { TFunction } from 'i18next';

type category = {
    id: string,
    name: string,
    description: string,
    iconId: string,
    habits: Array<Map<string, string>>,
    xp: number,
    nextLevelXp: number,
    actualLevelXp: number,
    level: number,
    createdAt: Date
}

type apiResponse = Record<string, category | string>;

async function getCategories(userId: string, t:TFunction): Promise<apiResponse> {
    try{
        const response = await axiosWithCredentials.get<category>(`/category/${userId}`);
        return {success: response.data};
    }catch(e){
        if(axios.isAxiosError(e)){
            console.error(e);
            return {error: e.response?.data || t('UnexpectedError')};
        }
        return {error: t('UnexpectedError')};
    }
}

export default getCategories