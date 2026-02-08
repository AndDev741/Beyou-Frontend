import { TFunction } from 'i18next';
import axios from '../axiosConfig';
import * as Yup from 'yup';
import { ApiErrorPayload, parseApiError } from '../apiError';

async function editHabit(
    habitId: string, 
    name: string, 
    description: string, 
    motivationalPhrase: string, 
    iconId: string, 
    importance: number, 
    dificulty: number, 
    categories: string[], 
    t: TFunction
): Promise<{ success?: unknown; error?: ApiErrorPayload; validation?: string; }> {

    const validation = Yup.object().shape({
        name: Yup.string().required(t('YupNameRequired')).min(2, t('YupMinimumName')).max(256, t('YupMaxName')),
        description: Yup.string().max(256, t('YupDescriptionMaxValue')),
        motivationalPhrase: Yup.string().max(256, t("YupGenericMaxLength")),
        importance: Yup.number().min(1, t("YupImportanceRequired")).required(t("YupImportanceRequired")),
        dificulty: Yup.number().min(1, t("YupDificultyRequired")).required(t("YupDificultyRequired")),
        iconId: Yup.string().required(t('YupIconRequired')),
        categories: Yup.array().min(1, t("YupRequiredCategories")).required(t("YupRequiredCategories"))
    })

    try{
        await validation.validate({name, description, motivationalPhrase, importance, dificulty, iconId, categories});

        try{
            const editHabitData = {
                habitId: habitId,
                name: name,
                description: description,
                motivationalPhrase: motivationalPhrase,
                iconId: iconId,
                importance: Number(importance),
                dificulty: Number(dificulty),
                categoriesId: categories
            }
            const response = await axios.put("/habit", editHabitData);
            return response.data;
        }catch(e){
            console.log(e);
            return {error: parseApiError(e)}
        }
    }catch(validationErrors){
        if(validationErrors instanceof Yup.ValidationError){
            return {validation: validationErrors.errors.join(', ')};
        }
        return {error: { message: t('UnexpectedError') }}
    }
}

export default editHabit;
