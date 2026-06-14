import axios from '../../axiosConfig';

async function refreshTokenRequest() {
    try {
        const response = await axios.post<String>("/auth/refresh");
        return response;
    } catch (e) {
        console.error(e);
        throw new Error("Not able to refresh token");
    }
}

export default refreshTokenRequest;