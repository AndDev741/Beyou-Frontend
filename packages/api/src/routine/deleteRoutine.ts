import { TFunction } from "i18next";
import { getHttpClient } from "../httpClient";
import { ApiErrorPayload, parseApiError } from "../apiError";
import { getLogger } from "../logger";

export default async function deleteRoutine(routineId: string, _t: TFunction): Promise<{ success?: unknown; error?: ApiErrorPayload; }>{
    try{
        // DELETE /routine/{id} returns 200/204 with no body, so response.data is undefined.
        // Return a defined object so callers can safely read `.error`/`.success`.
        await getHttpClient().delete(`/routine/${routineId}`);
        return { success: true };
    }catch(e){
        getLogger().error(e);
        return {error: parseApiError(e)};
    }
}
