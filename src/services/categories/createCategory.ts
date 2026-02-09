import { TFunction } from "i18next";
import axios from "../axiosConfig";
import { ApiErrorPayload, parseApiError } from "../apiError";
import { experienceToXpLevel } from "../../components/utils/experienceToXpLevel";

type apiResponse = Promise<{ success?: unknown; error?: ApiErrorPayload; validation?: string }>;

const createCategory = async (
    name: string,
    description: string,
    experience: number,
    icon: string,
    t: TFunction
): apiResponse => {
    const { level, xp } = experienceToXpLevel(experience);

    const categoryData = {
        name: name,
        description: description,
        icon: icon,
        level: level,
        xp: xp
    };

    try {
        const response = await axios.post("/category", categoryData);
        return response.data;
    } catch (e) {
        console.error(e);
        const parsed = parseApiError(e);
        return { error: parsed ?? { message: t("UnexpectedError") } };
    }
};

export default createCategory;
