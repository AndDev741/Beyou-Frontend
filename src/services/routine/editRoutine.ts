import { TFunction } from 'i18next';
import axios from '../axiosConfig';
import * as Yup from 'yup';
import { Routine } from '../../types/routine/routine';

type apiResponse = Promise<Record<string, string>>;

async function editRoutine(
    routine: Routine,
    t: TFunction
): apiResponse{

    const routineName = routine.name
    const routineSections = routine.routineSections

    console.log(routineName)

    const validation = Yup.object().shape({
         routineName: Yup.string().required(t('YupNameRequired')).min(2, t('YupMinimumName')).max(256, t('YupMaxName')),
         routineSections: Yup.array().min(1, t("At least, 1 section need to be created")).required(t("At least, 1 section need to be created"))
    });

    try{
        await validation.validate({routineName, routineSections});
        try{
            const response = await axios.put(`/routine/${routine.id}`, routine);
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

export default editRoutine;