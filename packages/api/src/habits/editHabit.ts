import { TFunction } from "i18next";
import { getHttpClient } from "../httpClient";
import { ApiErrorPayload, parseApiError } from "../apiError";
import { getLogger } from "../logger";

type apiResponse = Promise<{ success?: unknown; error?: ApiErrorPayload; validation?: string }>;

const editHabit = async (
    habitId: string,
    name: string,
    description: string,
    motivationalPhrase: string,
    iconId: string,
    importance: number,
    dificulty: number,
    categoriesId: string[],
    t: TFunction
): apiResponse => {
    const habitData = {
        habitId: habitId,
        name: name,
        description: description,
        motivationalPhrase: motivationalPhrase,
        importance: importance,
        dificulty: dificulty,
        iconId: iconId,
        categoriesId: categoriesId
    };

    try {
        const response = await getHttpClient().put(`/habit`, habitData);
        return response.data as { success?: unknown; error?: ApiErrorPayload; validation?: string };
    } catch (e) {
        getLogger().error(e);
        const parsed = parseApiError(e);
        return { error: parsed ?? { message: t("UnexpectedError") } };
    }
};

export default editHabit;
