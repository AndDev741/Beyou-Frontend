import { UserType } from '@beyou/types/user/UserType';
import axios from '../../axiosConfig';
import { detectTimezone } from '../../user/reconcileTimezone';

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
        return {error: ""};
    }

}

export default googleRequest;