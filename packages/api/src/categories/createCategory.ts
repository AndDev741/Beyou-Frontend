import { TFunction } from "i18next";
import { getHttpClient } from "../httpClient";
import { ApiErrorPayload, parseApiError } from "../apiError";
import { experienceToEnum } from "../utils/experienceToEnum";

type apiResponse = Promise<{ success?: unknown; error?: ApiErrorPayload; validation?: string }>;

const createCategory = async (
    name: string,
    description: string,
    experience: number,
    icon: string,
    t: TFunction
): apiResponse => {
    const categoryData = {
        name: name,
        description: description,
        icon: icon,
        experience: experienceToEnum(experience)
    };

    try {
        const response = await getHttpClient().post("/category", categoryData);
        return response.data as { success?: unknown; error?: ApiErrorPayload; validation?: string };
    } catch (e) {
        console.error(e);
        const parsed = parseApiError(e);
        return { error: parsed ?? { message: t("UnexpectedError") } };
    }
};

export default createCategory;
