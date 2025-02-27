import { UserType } from '../../types/user/UserType';
import axios from '../axiosConfig';

async function googleRequest(code: string): Promise<Record<string, UserType | string>>{
    try{
        if(code !== null){
            const response = await axios.get<Record<string, UserType>>(`/auth/google?code=${code}`);
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