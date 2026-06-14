import { TFunction } from "i18next";
import { getHttpClient } from "../httpClient";
import { ApiErrorPayload, parseApiError } from "../apiError";

export default async function deleteHabit(habitId: string, t:TFunction): Promise<{ success?: unknown; error?: ApiErrorPayload; }>{
    try{
        const response = await getHttpClient().delete(`/habit/${habitId}`);
        return response.data as { success?: unknown; error?: ApiErrorPayload };
    }catch(e){
        console.error(e);
        return {error: parseApiError(e)};
    }
}
