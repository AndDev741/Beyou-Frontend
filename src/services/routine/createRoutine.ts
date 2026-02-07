import { TFunction } from 'i18next';
import axios from '../axiosConfig';
import * as Yup from 'yup';
import { Routine } from '../../types/routine/routine';

type apiResponse = Promise<Record<string, string>>;

async function createRoutine(
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
            const response = await axios.post("/routine", routine);
            return response.data;
        }catch(e){
            console.error(e);
            return {error: getApiErrorMessage(e, t)};
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

const getApiErrorMessage = (error: unknown, t: TFunction): string => {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        if (!data) return t('UnexpectedError');
        if (typeof data === 'string') return data;
        if (typeof data === 'object') {
            const maybeError = (data as { error?: string }).error;
            if (maybeError) return maybeError;
            const maybeArgument = (data as { argumentError?: string }).argumentError;
            if (maybeArgument) return maybeArgument;
            const values = Object.values(data).filter((value) => typeof value === 'string') as string[];
            if (values.length > 0) return values.join(', ');
        }
    }
    return t('UnexpectedError');
};

export default createRoutine;
