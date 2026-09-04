import { TFunction } from "i18next";
import { getHttpClient } from "../httpClient";
import { ApiErrorPayload, parseApiError } from "../apiError";
import { getLogger } from "../logger";

type apiResponse = Promise<{ success?: unknown; error?: ApiErrorPayload; validation?: string }>;

const editGoal = async (
  goalId: string,
  title: string,
  iconId: string,
  description: string,
  targetValue: number,
  unit: string,
  currentValue: number,
  complete: boolean,
  categoriesId: string[],
  motivation: string,
  startDate: string,
  endDate: string,
  status: string,
  term: string,
  t: TFunction,
  /** Parent goal id; null moves the goal to the top level. Always sent: the server treats an absent value as "detach". */
  parentId: string | null = null
): apiResponse => {
  const goalData = {
    goalId: goalId,
    name: title,
    iconId: iconId,
    description: description,
    targetValue: targetValue,
    unit: unit,
    currentValue: currentValue,
    complete: complete,
    categoriesId: categoriesId,
    motivation: motivation,
    startDate: startDate,
    endDate: endDate,
    status: status,
    term: term,
    parentId: parentId ?? null
  };

  try {
    const response = await getHttpClient().put(`/goal`, goalData);
    return response.data as { success?: unknown; error?: ApiErrorPayload; validation?: string };
  } catch (e) {
    getLogger().error(e);
    const parsed = parseApiError(e);
    return { error: parsed ?? { message: t("UnexpectedError") } };
  }
};

export default editGoal;
