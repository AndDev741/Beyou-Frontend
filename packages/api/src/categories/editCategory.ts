import { TFunction } from "i18next";
import { getHttpClient } from "../httpClient";
import { ApiErrorPayload, parseApiError } from "../apiError";
import { getLogger } from "../logger";

type apiResponse = Promise<{ success?: unknown; error?: ApiErrorPayload; validation?: string }>;

const editCategory = async (
    categoryId: string,
    name: string,
    description: string,
    icon: string,
    t: TFunction
): apiResponse => {
    const categoryData = {
        categoryId: categoryId,
        name: name,
        description: description,
        icon: icon
    };

    try {
        const response = await getHttpClient().put(`/category`, categoryData);
        return response.data as { success?: unknown; error?: ApiErrorPayload; validation?: string };
    } catch (e) {
        getLogger().error(e);
        const parsed = parseApiError(e);
        return { error: parsed ?? { message: t("UnexpectedError") } };
    }
};

export default editCategory;
