import { TFunction } from 'i18next';
import axios from '../axiosConfig';
import * as Yup from 'yup';
import category from '../../types/category/categoryType';

type apiResponse = Promise<Record<string, string>>;

async function createHabit(
    userId: string, 
    name: string, 
    description: string, 
    motivationalPhrase: string, 
    importance: number, 
    dificulty: number, 
    iconId: string, 
    experience: number, 
    categories: category[], 
    t: TFunction
): apiResponse{
    let level = 0;
    let xp = 0;
    experience = Number(experience)

    switch(experience){
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
        motivationalPhrase: Yup.string().max(256, t("YupGenericMaxLength")),
        importance: Yup.number().required(t("YupImportanceRequired")),
        dificulty: Yup.number().required(t("YupDificultyRequired")),
        iconId: Yup.string().required(t('YupIconRequired')),
        experience: Yup.number().required(t('YupRequiredExperience')),
        categories: Yup.array().min(1, t("YupRequiredCategories")).required(t("YupRequiredCategories"))
    })

    
    const habitData = {
        userId: userId,
        name: name,
        description: description,
        motivationalPhrase: motivationalPhrase,
        iconId: iconId,
        importance: importance,
        dificulty: dificulty,
        categoriesId: categories,
        xp: xp,
        level: level
    }

    try{
        await validation.validate({name, description, motivationalPhrase, importance, dificulty, iconId, experience, categories});
        try{
            const response = await axios.post("/habit", habitData);
            return response.data;
        }catch(e){
            console.error(e);
            return {error: t('UnexpectedError')};
        }
    }catch(validationErrors){
        if(validationErrors instanceof Yup.ValidationError){
            console.error(validationErrors.errors)
            return {validation: validationErrors.errors.join(', ')};
        }else{
            return {error: t('UnexpectedError')};
        }
    }


}

export default createHabit;