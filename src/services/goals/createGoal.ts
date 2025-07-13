import { TFunction } from 'i18next';
import axios from '../axiosConfig';
import * as Yup from 'yup';

type apiResponse = Promise<Record<string, string>>;

async function createGoal(
  title: string,
  description: string,
  targetValue: number,
  unit: string,
  currentValue: number,
  complete: boolean,
  categoryId: string,
  motivation: string,
  startDate: string,
  endDate: string,
  xpReward: number,
  status: string,
  term: number,
  t: TFunction
): apiResponse {
  const validation = Yup.object().shape({
    title: Yup.string().required(t('YupNameRequired')).min(2, t('YupMinimumName')).max(256, t('YupMaxName')),
    description: Yup.string().max(256, t('YupDescriptionMaxValue')),
    targetValue: Yup.number().required(t('YupRequiredValue')),
    unit: Yup.string().required(t('YupUnitRequired')),
    currentValue: Yup.number().required(t('YupRequiredValue')),
    complete: Yup.boolean().required(t('YupRequired')),
    categoryId: Yup.string().required(t('YupCategoryRequired')),
    motivation: Yup.string().max(256, t('YupDescriptionMaxValue')),
    startDate: Yup.date().required(t('YupDateRequired')),
    endDate: Yup.date().required(t('YupDateRequired')),
    xpReward: Yup.number().required(t('YupRequiredValue')),
    status: Yup.string().required(t('YupStatusRequired')),
    term: Yup.string().required(t('YupTermRequired')),
  });

  const goalData = {
    title,
    description,
    targetValue,
    unit,
    currentValue,
    complete,
    categoryId,
    motivation,
    startDate,
    endDate,
    xpReward,
    status,
    term,
  };

  try {
    await validation.validate({ title, description, targetValue, unit, currentValue, complete, categoryId, motivation, startDate, endDate, xpReward, status, term });
    try {
      const response = await axios.post('/goal', goalData);
      return response.data;
    } catch (e) {
      console.error(e);
      return { error: t('UnexpectedError') };
    }
  } catch (validationErrors) {
    if (validationErrors instanceof Yup.ValidationError) {
      return { validation: validationErrors.errors.join(', ') };
    }
    return { error: t('UnexpectedError') };
  }
}

export default createGoal;