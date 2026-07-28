import axios from '../../axiosConfig';

async function refreshTokenRequest() {
    try {
        const response = await axios.post<String>("/auth/refresh");
        return response;
    } catch (e) {
        console.error(e);
        // Rethrown as-is rather than replaced with a fresh Error: the HTTP
        // status is the whole signal. `axiosConfig`'s interceptor classifies
        // this failure to decide whether the collector should hear about it,
        // and an opaque `new Error("Not able to refresh token")` erases the one
        // thing that separates a routine expired session (401, silent) from the
        // auth backend being down (5xx, an incident). Every caller either logs
        // it or swallows it, so nothing depended on the old message.
        throw e;
    }
}

export default refreshTokenRequest;