import { TFunction } from 'i18next';
import axios from '../axiosConfig';
import * as Yup from 'yup';
import { ApiErrorPayload, parseApiError } from '../apiError';

async function editGoal(
  goalId: string,
  title: string,
  iconId: string,
  description: string,
  targetValue: number,
  unit: string,
  currentValue: number,
  complete: boolean,
  categoriesId: string[],
  motivation: string,
  startDate: string,
  endDate: string,
  status: string,
  term: string,
  t: TFunction
): Promise<{ success?: unknown; error?: ApiErrorPayload; validation?: string }> {
  const validation = Yup.object().shape({
    title: Yup.string().required(t('YupNameRequired')).min(2, t('YupMinimumName')).max(256, t('YupMaxName')),
    iconId: Yup.string().required(t('YupIconRequired')),
    description: Yup.string().max(256, t('YupDescriptionMaxValue')),
    targetValue: Yup.number().required(t('YupRequiredValue')),
    unit: Yup.string().required(t('YupUnitRequired')),
    currentValue: Yup.number().required(t('YupRequiredValue')),
    complete: Yup.boolean().required(t('YupRequired')),
    categoriesId: Yup.array().required(t('YupCategoryRequired')),
    motivation: Yup.string().max(256, t('YupDescriptionMaxValue')),
    startDate: Yup.date().required(t('YupDateRequired')),
    endDate: Yup.date().required(t('YupDateRequired')),
    status: Yup.string().required(t('YupStatusRequired')),
    term: Yup.string().required(t('YupTermRequired')),
  });
  try {
    await validation.validate({ title, iconId, description, targetValue, unit, currentValue, complete, categoriesId, motivation, startDate, endDate, status, term });
    try {
      const editData = { goalId, name: title, iconId, description, targetValue, unit, currentValue, complete, categoriesId, motivation, startDate, endDate, status, term };
      const response = await axios.put('/goal', editData);
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

export default editGoal;
