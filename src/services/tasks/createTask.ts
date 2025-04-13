import { TFunction } from 'i18next';
import axios from '../axiosConfig';
import * as Yup from 'yup';

type apiResponse = Promise<Record<string, string>>;

async function createTask(
  name: string,
  description: string,
  iconId: string,
  categoriesId: string[],
  t: TFunction,
  importance?: number,
  difficulty?: number,
): apiResponse {

  const validation = Yup.object().shape({
    name: Yup.string()
      .required(t('YupNameRequired'))
      .min(2, t('YupMinimumName'))
      .max(256, t('YupMaxName')),
    description: Yup.string().max(256, t('YupDescriptionMaxValue')),
    iconId: Yup.string().required(t('YupIconRequired')),
    importance: Yup.number().nullable(),
    difficulty: Yup.number().nullable(),
  }).test(
    'importance-difficulty-required',
    t('Importance and Difficulty must be set together'),
    function (value) {
      const { importance, difficulty } = value;
      return (
        (importance !== 0 && difficulty !== 0) ||
        (importance === 0 && difficulty === 0)
      );
    }
  );

  const taskData = {
    name: name,
    description: description,
    iconId: iconId,
    importance: importance,
    difficulty: difficulty,
    categoriesId: categoriesId,
  }

  console.log(taskData);

  try {
    await validation.validate({ name, description, iconId, importance, difficulty });
    try {
      const response = await axios.post("/task", taskData);
      return response.data;
    } catch (e) {
      console.error(e);
      return { error: t('UnexpectedError') };
    }
  } catch (validationErrors) {
    if (validationErrors instanceof Yup.ValidationError) {
      console.error(validationErrors.errors)
      return { validation: validationErrors.errors.join(', ') };
    } else {
      return { error: t('UnexpectedError') };
    }
  }


}

export default createTask;