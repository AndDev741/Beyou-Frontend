import { TFunction } from "i18next";
import { getHttpClient } from "../httpClient";
import { ApiErrorPayload, parseApiError } from "../apiError";
import { trackItemCreated } from "../analyticsEvents";
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
  /** Parent goal id for a sub-goal; omit or null for a top-level goal. */
  parentId: string | null = null
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
    parentId: parentId ?? null
  };

  try {
    const response = await getHttpClient().post("/goal", goalData);
    const data = response.data as { success?: unknown; error?: ApiErrorPayload; validation?: string };
    trackItemCreated('goal', data);
    return data;
  } catch (e) {
    getLogger().error(e);
    const parsed = parseApiError(e);
    return { error: parsed ?? { message: t("UnexpectedError") } };
  }
};

export default createGoal;
