import { TFunction } from "i18next";
import { getHttpClient } from "../httpClient";
import { ApiErrorPayload, parseApiError } from "../apiError";
import { experienceToEnum } from "../utils/experienceToEnum";
import { getLogger } from "../logger";

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
        const response = await getHttpClient().post("/habit", habitData);
        return response.data as { success?: unknown; error?: ApiErrorPayload; validation?: string };
    } catch (e) {
        getLogger().error(e);
        const parsed = parseApiError(e);
        return { error: parsed ?? { message: t("UnexpectedError") } };
    }
};

export default createHabit;
