import { TFunction } from 'i18next';
import axios from '../axiosConfig';
import * as Yup from 'yup';

type apiResponse = Promise<Record<string, string>>;

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
  status: number,
  term: number,
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
    status: Yup.number().required(t('YupStatusRequired')),
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