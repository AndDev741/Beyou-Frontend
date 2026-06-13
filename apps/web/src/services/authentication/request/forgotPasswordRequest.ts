import axios from "../../axiosConfig";
import { ApiErrorPayload, parseApiError } from "../../apiError";

export type ForgotPasswordResponse = {
    success?: boolean;
    error?: ApiErrorPayload;
};

async function forgotPasswordRequest(email: string): Promise<ForgotPasswordResponse> {
    try {
        const response = await axios.post<{ success: boolean }>("/auth/forgot-password", { email });
        return response.data ?? { success: true };
    } catch (e) {
        console.error(e);
        return { error: parseApiError(e) };
    }
}

export default forgotPasswordRequest;
