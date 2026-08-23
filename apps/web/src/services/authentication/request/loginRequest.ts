import axios from '../../axiosConfig';
import { UserType } from '@beyou/types/user/UserType';
import { isRateLimited, RATE_LIMIT_ERROR_KEY } from '@beyou/api/apiError';

async function loginRequest(email: string, password: string): Promise<Record<string, UserType | string>> {
    const loginData = {
        email: email,
        password: password
    };

    try {
        const response = await axios.post<Record<string, UserType>>("/auth/login", loginData);

        const accessToken = response.headers["x-access-token"];
        axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        return response.data;
    } catch (e: unknown) {
        if (e && typeof e === 'object' && 'response' in e) {
            const axiosError = e as { response?: { status?: number; data?: Record<string, string> } };
            if (axiosError.response?.status === 403 && axiosError.response?.data?.error === "EMAIL_NOT_VERIFIED") {
                return { error: "EMAIL_NOT_VERIFIED" };
            }
        }
        // Told apart from a bad password on purpose. The login bucket is keyed by
        // address and fires whether or not the account exists, so naming it reveals
        // nothing about which emails are registered — the per-account lockout is the
        // one that must keep answering exactly like a wrong password, and it still
        // does. Everything else stays a single indistinguishable refusal.
        if (isRateLimited(e)) {
            return { error: RATE_LIMIT_ERROR_KEY };
        }
        return { error: " " };
    }
}

export default loginRequest;
