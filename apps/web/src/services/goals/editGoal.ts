import { TFunction } from "i18next";
import axios from "../axiosConfig";
import { ApiErrorPayload, parseApiError } from "../apiError";

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
  t: TFunction
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
    term: term
  };

  try {
    const response = await axios.put(`/goal`, goalData);
    return response.data;
  } catch (e) {
    console.error(e);
    const parsed = parseApiError(e);
    return { error: parsed ?? { message: t("UnexpectedError") } };
  }
};

export default editGoal;
