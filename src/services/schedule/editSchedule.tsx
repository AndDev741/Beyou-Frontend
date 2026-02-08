import { TFunction } from 'i18next';
import axios from '../axiosConfig';
import * as Yup from 'yup';
import { ApiErrorPayload, parseApiError } from '../apiError';

async function editSchedule(
    scheduleId: string,
    days: string[],
    routineId: string,
    t: TFunction
): Promise<{ success?: unknown; error?: ApiErrorPayload; validation?: string }> {

    const validation = Yup.object().shape({
        routineId: Yup.string()
            .required(t('RoutineIdRequired') || 'Routine ID é obrigatório.'),

        days: Yup.array()
            .of(Yup.string().required(t('DayInvalid')))
            .required(t('DaysRequired'))
    });

    const scheduleData = {
        scheduleId,
        days,
        routineId
    };

    try {
        await validation.validate({ routineId, days });

        try {
            const response = await axios.put("/schedule", scheduleData);
            return response.data;
        } catch (e) {
            console.log(e);
            return { error: parseApiError(e) }
        }
    } catch (validationErrors) {
        if (validationErrors instanceof Yup.ValidationError) {
            return { validation: validationErrors.errors.join(', ') };
        }
        return { error: { message: t('UnexpectedError') } }
    }
}

export default editSchedule;
