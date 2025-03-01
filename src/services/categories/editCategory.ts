import axiosWithCredentials from '../axiosConfig';
import axios from 'axios';
import * as Yup from 'yup';
import { TFunction } from 'i18next';

type apiResponse = Record<string, string>;

async function editCategory(
    id: string, 
    name: string, 
    description: string, 
    icon: string, 
    t: TFunction
): Promise<apiResponse> {

    const editData = {
        categoryId: id,
        name: name,
        icon: icon,
        description: description
    }

    const validation = Yup.object().shape({
        name: Yup.string().required(t('YupNameRequired')).min(2, t('YupMinimumName')).max(256, t('YupMaxName')),
        description: Yup.string().max(256, t('YupDescriptionMaxValue')),
        icon: Yup.string().required(t('YupIconRequired')),
    })

    try{
        await validation.validate({name, description, icon});

        try{
            const response = await axiosWithCredentials.put<apiResponse>("/category", editData);
            return response.data;
        }catch(e){
            if(axios.isAxiosError(e)){
                console.error(e);
                switch(e.response?.data.error){
                    case "Category not found":
                        return {error: t('Category not found')};
                    default:
                        return {error: t('UnexpectedError')};
                }
            }
            return {error: t('UnexpectedError')};
        }

    }catch(validationErrors){
        if(validationErrors instanceof Yup.ValidationError){
            return {validation: validationErrors.errors.join(", ")};
        }
        return {error: t('UnexpectedError')};
    }
}

export default editCategory;