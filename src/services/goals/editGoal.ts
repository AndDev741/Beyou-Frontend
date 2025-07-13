import { TFunction } from 'i18next';
import axios from '../axiosConfig';
import * as Yup from 'yup';

async function editGoal(
  goalId: string,
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
  term: string,
  t: TFunction
): Promise<Record<string, string>> {
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
  try {
    await validation.validate({ title, description, targetValue, unit, currentValue, complete, categoryId, motivation, startDate, endDate, xpReward, status, term });
    try {
      const editData = { goalId, title, description, targetValue, unit, currentValue, complete, categoryId, motivation, startDate, endDate, xpReward, status, term };
      const response = await axios.put('/goal', editData);
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

export default editGoal;