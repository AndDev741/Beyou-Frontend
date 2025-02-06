import axios from '../axiosConfig';
import * as Yup from 'yup';

async function editHabit(habitId, name, description, motivationalPhrase, iconId, importance, dificulty, categories, t){
    const validation = Yup.object().shape({
        name: Yup.string().required(t('YupNameRequired')).min(2, t('YupMinimumName')).max(256, t('YupMaxName')),
        description: Yup.string().max(256, t('YupDescriptionMaxValue')),
        motivationalPhrase: Yup.string().max(256, t("YupGenericMaxLength")),
        importance: Yup.number().required(t("YupImportanceRequired")),
        dificulty: Yup.number().required(t("YupDificultyRequired")),
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
            return e.response.data
        }
    }catch(validationErrors){
        return {validation: validationErrors.errors};
    }
}

export default editHabit;