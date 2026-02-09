import axios from '../../axiosConfig';
import { UserType } from '../../../types/user/UserType';

async function loginRequest(email: string, password: string): Promise<Record<string, UserType | string>> {
    const loginData = {
        email: email,
        password: password
    };

    try {
        const response = await axios.post<Record<string, UserType>>("/auth/login", loginData);

        const accessToken = response.headers["accesstoken"];
        axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        return response.data;
    } catch (e) {
        console.error(e);
        return { error: " " };
    }
}

export default loginRequest;
