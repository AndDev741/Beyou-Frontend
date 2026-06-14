import { EditUser } from "@beyou/types/user/EditUser";
import { UserType } from "@beyou/types/user/UserType";
import { getHttpClient, ApiError } from '../httpClient';
import { ApiErrorPayload, parseApiError } from "../apiError";
import { getLogger } from "../logger";

type EditUserResponse = {
    data?: UserType;
    error?: ApiErrorPayload;
};

export default async function editUser(payload: EditUser): Promise<EditUserResponse> {
    try{
        const response = await getHttpClient().put<UserType>("/user", payload);
        return { data: response.data };
    }catch(e){
        getLogger().error(e);
        if(e instanceof ApiError){
            return { error: parseApiError(e) };
        }
        return { error: { errorKey: 'UnexpectedError' } };
    }
}
