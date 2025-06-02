import { TFunction } from 'i18next';
import axios from '../axiosConfig';
import * as Yup from 'yup';

async function editSchedule(
    scheduleId: string,
    days: string[],
    routineId: string,
    t: TFunction
): Promise<Record<string, string>> {

    const validation = Yup.object().shape({
        routineId: Yup.string()
            .required(t('RoutineIdRequired') || 'Routine ID é obrigatório.'),

        days: Yup.array()
            .of(Yup.string().required(t('DayInvalid')))
            .min(1, t('DaysRequired'))
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
            return { error: t('UnexpectedError') }
        }
    } catch (validationErrors) {
        if (validationErrors instanceof Yup.ValidationError) {
            return { validation: validationErrors.errors.join(', ') };
        }
        return { error: t('UnexpectedError') }
    }
}

export default editSchedule;