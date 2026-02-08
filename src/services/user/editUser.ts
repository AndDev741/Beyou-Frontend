import { EditUser } from "../../types/user/EditUser";
import { UserType } from "../../types/user/UserType";
import axiosWithCredentials from '../axiosConfig';
import axios from 'axios';
import { ApiErrorPayload, parseApiError } from "../apiError";

type EditUserResponse = {
    data?: UserType;
    error?: ApiErrorPayload;
};

export default async function editUser(payload: EditUser): Promise<EditUserResponse> {
    try{
        const response = await axiosWithCredentials.put<UserType>("/user", payload);
        return { data: response.data };
    }catch(e){
        console.error(e);
        if(axios.isAxiosError(e)){
            return { error: parseApiError(e) };
        }
        return { error: { message: "Unexpected error" } };
    }
}
