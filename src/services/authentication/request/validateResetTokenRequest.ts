import axios from "../../axiosConfig";
import { ApiErrorPayload, parseApiError } from "../../apiError";

export type ValidateResetTokenResponse = {
    valid?: boolean;
    error?: ApiErrorPayload;
};

async function validateResetTokenRequest(token: string): Promise<ValidateResetTokenResponse> {
    try {
        const response = await axios.get<{ valid: boolean }>("/auth/reset-password/validate", {
            params: { token }
        });
        return response.data ?? { valid: true };
    } catch (e) {
        console.error(e);
        return { error: parseApiError(e) };
    }
}

export default validateResetTokenRequest;
