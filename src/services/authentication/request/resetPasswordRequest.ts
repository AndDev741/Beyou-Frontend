import axios from "../../axiosConfig";
import { ApiErrorPayload, parseApiError } from "../../apiError";

export type ResetPasswordResponse = {
    success?: boolean;
    error?: ApiErrorPayload;
};

async function resetPasswordRequest(token: string, password: string): Promise<ResetPasswordResponse> {
    try {
        const response = await axios.post<{ success: boolean }>("/auth/reset-password", {
            token,
            password
        });
        return response.data ?? { success: true };
    } catch (e) {
        console.error(e);
        return { error: parseApiError(e) };
    }
}

export default resetPasswordRequest;
