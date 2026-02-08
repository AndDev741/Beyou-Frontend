import axiosWithCredentials from '../axiosConfig';
import axios from 'axios';
import * as Yup from 'yup';
import { TFunction } from 'i18next';
import { ApiErrorPayload, parseApiError } from '../apiError';

type apiResponse = {
    success?: unknown;
    error?: ApiErrorPayload;
    validation?: string;
};

async function createCategory (
    name: string, 
    description: string, 
    experience: number, 
    icon: string, 
    t: TFunction
): Promise<apiResponse> {

    let level = 0;
    let xp = 0;

    switch(Number(experience)){
        case 1:
            level += 5
            xp += 750;
            break;
        case 2:
            level = 8;
            xp = 1800;
            break;
        default:
            level = 0;
            xp = 0;
            break;
    }

    const validation = Yup.object().shape({
        name: Yup.string().required(t('YupNameRequired')).min(2, t('YupMinimumName')).max(256, t('YupMaxName')),
        description: Yup.string().max(256, t('YupDescriptionMaxValue')),
        experience: Yup.number().required(t('YupRequiredExperience')),
        icon: Yup.string().required(t('YupIconRequired')),
    })

    try{
        
        await validation.validate({name, description, experience, icon, level, xp});
        try{
            const categoryData = {
                name: name,
                icon: icon,
                description: description,
                level: level,
                xp: xp,
            }
            const response = await axiosWithCredentials.post<apiResponse>("/category", categoryData);
            return response.data;
        }catch(e){
            if(axios.isAxiosError(e)){
                return { error: parseApiError(e) };
            }

        }

    }catch(validationErrors){
        if(validationErrors instanceof Yup.ValidationError){
            return {validation: validationErrors.errors.join(', ')};
        }
        return {error: { message: t('UnexpectedError') }};
    }

    return {error: { message: t('UnexpectedError') }};
}


export default createCategory;
