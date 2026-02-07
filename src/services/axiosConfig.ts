import axios from 'axios';
import refreshTokenRequest from './authentication/request/refreshTokenRequest';

const instance = axios.create({
    baseURL: 'http://localhost:8099',
    withCredentials: true
});

instance.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;

        if (!error.response) {
            return Promise.reject(error);
        }

        if (originalRequest.url.includes("/auth/refresh") || originalRequest.url.includes("/auth/login") || originalRequest.url.includes("/auth/google")) { //Refresh auth trow 401 too, so we need toi escape here
            return Promise.reject(error);
        }

        if(error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const response = await refreshTokenRequest();
                const accessToken = response.headers["accesstoken"];

                console.log("NEW TOKEN => ", accessToken);
                instance.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;

                return instance(originalRequest);
            }catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                window.location.href = "/";
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
)

export default instance;