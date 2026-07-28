import axios from 'axios';
import { toast } from 'react-toastify';
import i18next from 'i18next';
import { ApiError, isReportableFailure } from '@beyou/api';
import refreshTokenRequest from './authentication/request/refreshTokenRequest';
import { reportHandledFailure } from '../lib/telemetry';

// Backend serves all endpoints under /api/v1 (see Beyou-backend-spring application.yaml).
// VITE_API_URL should already include the /api/v1 suffix in deployed environments.
const instance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8099/api/v1',
    withCredentials: true
});

let refreshPromise: Promise<string> | null = null;

export const getRefreshedAccessToken = async () => {
    if (!refreshPromise) {
        refreshPromise = refreshTokenRequest()
            .then(response => {
                const accessToken = response.headers["x-access-token"];
                if (!accessToken) {
                    throw new Error("No access token in refresh response");
                }
                return accessToken;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }
    return refreshPromise;
};

/**
 * The HTTP status an axios rejection came back with, or `undefined` when the
 * rejection carries no response at all.
 *
 * Read structurally rather than through `axios.isAxiosError`, which the test
 * suite's axios stub hard-codes to `false` — a classifier that silently
 * degrades under test is worse than no classifier.
 */
const responseStatus = (value: unknown): number | undefined => {
    const status = (value as { response?: { status?: unknown } } | null | undefined)?.response
        ?.status;
    return typeof status === 'number' ? status : undefined;
};

/**
 * A refresh-endpoint outage is otherwise completely invisible.
 *
 * The interceptor below rejects with the caller's ORIGINAL 401 — which is
 * accurate, that is what the caller's request returned — but 401 is
 * deliberately not reportable, and the only other caller of the refresh
 * (`useSilentRefresh`) swallows its failure with `catch {}`. So if
 * `/auth/refresh` starts answering 500, every signed-in user is bounced to the
 * login screen and the collector never hears a thing.
 *
 * The rule for what deserves an issue is NOT restated here: `isReportableFailure`
 * in `@beyou/api` already owns it (5xx and transport failures yes, 4xx no) and
 * web and mobile have to agree on that boundary. The refresh rejection is
 * re-expressed as the `ApiError` that classifier understands; a rejection with
 * no recognisable status is passed through unwrapped, which `isReportableFailure`
 * treats as a fault in our own code — right for both "the connection never
 * landed" and "the refresh answered 200 with no token".
 */
const reportRefreshFailure = (refreshError: unknown): void => {
    const status = responseStatus(refreshError);
    const subject =
        status === undefined
            ? refreshError
            : new ApiError(status, undefined, `Token refresh failed with HTTP ${status}`);

    if (isReportableFailure(subject)) {
        reportHandledFailure(subject);
    }
};

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

        if (error.response.status === 429) {
            toast.error(i18next.t('RATE_LIMIT_EXCEEDED'));
            return Promise.reject(error);
        }

        if(error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const accessToken = await getRefreshedAccessToken();

                instance.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
                if (!originalRequest.headers) {
                    originalRequest.headers = {};
                }
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;

                return instance(originalRequest);
            }catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                reportRefreshFailure(refreshError);
                window.location.href = "/";
                // Reject with the ORIGINAL 401, not the refresh failure. The
                // caller's request did fail with 401 — that is the accurate
                // outcome — and it is what error classification needs: the
                // refresh error is an opaque non-ApiError, so surfacing it made
                // every expired session look like an unrecognised fault worth
                // reporting to the collector. Expired sessions are routine.
                return Promise.reject(error);
            }
        }
        return Promise.reject(error);
    }
)

export default instance;
