import { TFunction } from "i18next";
import axiosWithCredential from "../axiosConfig";

export default async function deleteHabit(habitId: string, t:TFunction): Promise<Record<string, string>>{
    try{
        const response = await axiosWithCredential.delete<Record<string, string>>(`/habit/${habitId}`);
        return response.data;
    }catch(e){
        console.error(e);
        return {error: t('UnexpectedError')};
    }
}