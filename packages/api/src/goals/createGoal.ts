import { TFunction } from "i18next";
import { getHttpClient } from "../httpClient";
import { ApiErrorPayload, parseApiError } from "../apiError";
import { getLogger } from "../logger";

type apiResponse = Promise<{ success?: unknown; error?: ApiErrorPayload; validation?: string }>;

const createGoal = async (
  title: string,
  iconId: string,
  description: string,
  targetValue: number,
  unit: string,
  currentValue: number,
  categoriesId: string[],
  motivation: string,
  startDate: string,
  endDate: string,
  status: string,
  term: string,
  t: TFunction,
  id?: string
): apiResponse => {
  const goalData = {
    name: title,
    iconId: iconId,
    description: description,
    targetValue: targetValue,
    unit: unit,
    currentValue: currentValue,
    categoriesId: categoriesId,
    motivation: motivation,
    startDate: startDate,
    endDate: endDate,
    status: status,
    term: term,
    ...(id ? { id } : {})
  };

  try {
    const response = await getHttpClient().post("/goal", goalData);
    return response.data as { success?: unknown; error?: ApiErrorPayload; validation?: string };
  } catch (e) {
    getLogger().error(e);
    const parsed = parseApiError(e);
    return { error: parsed ?? { message: t("UnexpectedError") } };
  }
};

export default createGoal;
