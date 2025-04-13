import { TFunction } from "i18next";
import axiosWithCredential from "../axiosConfig";

export default async function deleteTask(taskId: string, t:TFunction): Promise<Record<string, string>>{
    try{
        const response = await axiosWithCredential.delete<Record<string, string>>(`/task/${taskId}`);
        return response.data;
    }catch(e){
        console.error(e);
        return {error: t('UnexpectedError')};
    }
}