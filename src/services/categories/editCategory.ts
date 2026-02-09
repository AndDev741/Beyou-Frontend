import { TFunction } from "i18next";
import axios from "../axiosConfig";
import { ApiErrorPayload, parseApiError } from "../apiError";

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
        const response = await axios.put(`/category`, categoryData);
        return response.data;
    } catch (e) {
        console.error(e);
        const parsed = parseApiError(e);
        return { error: parsed ?? { message: t("UnexpectedError") } };
    }
};

export default editCategory;
