import { TFunction } from "i18next";
import { getHttpClient } from "../httpClient";
import { ApiErrorPayload, parseApiError } from "../apiError";
import { trackItemCreated } from "../analyticsEvents";
import { experienceToEnum } from "../utils/experienceToEnum";
import { getLogger } from "../logger";

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
        const data = response.data as { success?: unknown; error?: ApiErrorPayload; validation?: string };
        trackItemCreated('category', data);
        return data;
    } catch (e) {
        getLogger().error(e);
        const parsed = parseApiError(e);
        return { error: parsed ?? { message: t("UnexpectedError") } };
    }
};

export default createCategory;
