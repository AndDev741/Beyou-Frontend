import { TFunction } from "i18next";
import axios from "../axiosConfig";
import { ApiErrorPayload, parseApiError } from "../apiError";
import { experienceToEnum } from "../../components/utils/experienceToXpLevel";

type apiResponse = Promise<{ success?: unknown; error?: ApiErrorPayload; validation?: string }>;

const createHabit = async (
    name: string,
    description: string,
    motivationalPhrase: string,
    importance: number,
    dificulty: number,
    iconId: string,
    experience: number,
    categoriesId: string[],
    t: TFunction
): apiResponse => {
    const habitData = {
        name: name,
        description: description,
        motivationalPhrase: motivationalPhrase,
        importance: importance,
        dificulty: dificulty,
        iconId: iconId,
        categoriesId: categoriesId,
        experience: experienceToEnum(experience)
    };

    try {
        const response = await axios.post("/habit", habitData);
        return response.data;
    } catch (e) {
        console.error(e);
        const parsed = parseApiError(e);
        return { error: parsed ?? { message: t("UnexpectedError") } };
    }
};

export default createHabit;
