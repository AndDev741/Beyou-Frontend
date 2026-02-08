import { TFunction } from 'i18next';
import axios from '../axiosConfig';
import * as Yup from 'yup';
import { ApiErrorPayload, parseApiError } from '../apiError';

type apiResponse = Promise<{ success?: unknown; error?: ApiErrorPayload; validation?: string }>;

async function createSchedule(
  days: string[],
  routineId: string,
  t: TFunction
): apiResponse {

  const validation = Yup.object().shape({
    routineId: Yup.string()
      .required(t('RoutineIdRequired') || 'Routine ID é obrigatório.'),
    
    days: Yup.array()
      .of(Yup.string().required(t('DayInvalid')))
      .min(1, t('DaysRequired'))
      .required(t('DaysRequired'))
  });

  const scheduleData = {
    days,
    routineId
  };

  try {
    await validation.validate(scheduleData, { abortEarly: false });
    try {
      const response = await axios.post("/schedule", scheduleData);
      return response.data;
    } catch (e) {
      console.error(e);
      return { error: parseApiError(e) };
    }
  } catch (validationErrors) {
    if (validationErrors instanceof Yup.ValidationError) {
      console.error(validationErrors.errors);
      return { validation: validationErrors.errors.join(', ') };
    } else {
      return { error: { message: t('UnexpectedError') } };
    }
  }
}

export default createSchedule;
