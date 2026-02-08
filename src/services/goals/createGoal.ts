import { TFunction } from 'i18next';
import axios from '../axiosConfig';
import * as Yup from 'yup';
import { ApiErrorPayload, parseApiError } from '../apiError';

type apiResponse = Promise<{ success?: unknown; error?: ApiErrorPayload; validation?: string }>;

async function createGoal(
  title: string,
  iconId: string,
  description: string,
  targetValue: number,
  unit: string,
  currentValue: number,
  categoriesId: string[],
  motivation: string,
  startDate: string,
  endDate: string,
  status: string,
  term: string,
  t: TFunction
): apiResponse {
  const validation = Yup.object().shape({
    title: Yup.string().required(t('YupNameRequired')).min(2, t('YupMinimumName')).max(256, t('YupMaxName')),
    iconId: Yup.string().required(t('YupNameRequired')),
    description: Yup.string().max(256, t('YupDescriptionMaxValue')),
    targetValue: Yup.number().required(t('YupRequiredValue')),
    unit: Yup.string().required(t('YupUnitRequired')),
    currentValue: Yup.number().required(t('YupRequiredValue')),
    categoriesId: Yup.array().required(t('YupCategoryRequired')),
    motivation: Yup.string().max(256, t('YupDescriptionMaxValue')),
    startDate: Yup.date().required(t('YupDateRequired')),
    endDate: Yup.date().required(t('YupDateRequired')),
    status: Yup.string().required(t('YupStatusRequired')),
    term: Yup.string().required(t('YupTermRequired')),
  });

  const goalData = {
    name: title,
    iconId,
    description,
    targetValue,
    unit,
    currentValue,
    categoriesId,
    motivation,
    startDate,
    endDate,
    status,
    term,
  };

  try {
    await validation.validate({ title, iconId, description, targetValue, unit, currentValue, categoriesId, motivation, startDate, endDate, status, term });
    try {
      const response = await axios.post('/goal', goalData);
      return response.data;
    } catch (e) {
      console.error(e);
      return { error: parseApiError(e) };
    }
  } catch (validationErrors) {
    if (validationErrors instanceof Yup.ValidationError) {
      return { validation: validationErrors.errors.join(', ') };
    }
    return { error: { message: t('UnexpectedError') } };
  }
}

export default createGoal;
