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
        // Same bucket as password login (5 per 15 minutes, keyed by address), so the
        // same distinction: being throttled is not a broken sign-in.
        if (isRateLimited(e)) {
            return { error: RATE_LIMIT_ERROR_KEY };
        }
        return {error: ""};
    }

}

export default googleRequest;