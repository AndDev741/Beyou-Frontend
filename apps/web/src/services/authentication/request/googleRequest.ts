import { UserType } from '@beyou/types/user/UserType';
import axios from '../../axiosConfig';
import { detectTimezone } from '../../user/reconcileTimezone';
import { isRateLimited, RATE_LIMIT_ERROR_KEY } from '@beyou/api/apiError';

async function googleRequest(code: string): Promise<Record<string, UserType | string>>{
    try{
        if(code !== null){
            // Applied only when the backend CREATES the account; an existing one keeps
            // whatever it has. Encoded, because a zone id contains a slash.
            const timezone = detectTimezone();
            const timezoneParam = timezone ? `&timezone=${encodeURIComponent(timezone)}` : '';
            const response = await axios.get<Record<string, UserType>>(`/auth/google?code=${code}${timezoneParam}`);

            const accessToken = response.headers["x-access-token"];
            axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
            return response.data;
        }else{
            return {error: ""};
        }
    }catch(e){
        console.error(e);
        // Google no longer walks past the verification gate: an unverified password
        // account with the same address is refused here exactly as it is on /auth/login.
        // Told apart from a broken sign-in because the screen has a cure for it — the
        // resend button — and "Google sign-in failed" would send the user nowhere.
        if (e && typeof e === 'object' && 'response' in e) {
            const axiosError = e as { response?: { status?: number; data?: Record<string, string> } };
            if (axiosError.response?.status === 403 && axiosError.response?.data?.error === "EMAIL_NOT_VERIFIED") {
                return { error: "EMAIL_NOT_VERIFIED" };
            }
        }
        // Same bucket as password login (5 per 15 minutes, keyed by address), so the
        // same distinction: being throttled is not a broken sign-in.
        if (isRateLimited(e)) {
            return { error: RATE_LIMIT_ERROR_KEY };
        }
        return {error: ""};
    }

}

export default googleRequest;