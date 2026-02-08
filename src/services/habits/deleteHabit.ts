import { TFunction } from "i18next";
import axiosWithCredential from "../axiosConfig";
import { ApiErrorPayload, parseApiError } from "../apiError";

export default async function deleteHabit(habitId: string, t:TFunction): Promise<{ success?: unknown; error?: ApiErrorPayload; }>{
    try{
        const response = await axiosWithCredential.delete(`/habit/${habitId}`);
        return response.data;
    }catch(e){
        console.error(e);
        return {error: parseApiError(e)};
    }
}
