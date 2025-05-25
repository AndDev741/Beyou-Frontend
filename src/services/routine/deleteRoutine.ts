import { TFunction } from "i18next";
import axiosWithCredential from "../axiosConfig";

export default async function deleteRoutine(routineId: string, t:TFunction): Promise<Record<string, string>>{
    try{
        const response = await axiosWithCredential.delete<Record<string, string>>(`/routine/${routineId}`);
        return response.data;
    }catch(e){
        console.error(e);
        return {error: t('UnexpectedError')};
    }
}