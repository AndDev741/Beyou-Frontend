import { TFunction } from 'i18next';
import axios from '../axiosConfig';
import * as Yup from 'yup';

async function editTask(
    taskId: string,
    name: string,
    description: string,
    iconId: string,
    importance: number,
    difficulty: number,
    categories: string[],
    oneTimeTask: boolean,
    t: TFunction
): Promise<Record<string, string>> {

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

    const editTaskData = {
        taskId: taskId,
        name: name,
        description: description,
        iconId: iconId,
        importance: Number(importance),
        difficulty: Number(difficulty),
        categoriesId: categories,
        oneTimeTask: oneTimeTask,
    }

    console.log("EDIT TASK DATA => ", editTaskData);
    try {
        await validation.validate({ name, description, iconId, importance, difficulty });

        try {

            const response = await axios.put("/task", editTaskData);
            return response.data;
        } catch (e) {
            console.error(e);
            return { error: t('UnexpectedError') }
        }
    } catch (validationErrors) {
        console.error(validationErrors);
        if (validationErrors instanceof Yup.ValidationError) {
            return { validation: validationErrors.errors.join(', ') };
        }
        return { error: t('UnexpectedError') }
    }
}

export default editTask;