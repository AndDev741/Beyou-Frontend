import { ApiError, isReportableFailure } from "@beyou/api";
import { reportHandledFailure } from "../../lib/telemetry";

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
    return typeof status === "number" ? status : undefined;
};

/**
 * Reports a `/auth/refresh` failure, if it is the kind worth an issue.
 *
 * Shared by BOTH refresh callers, which is the point of it living here rather
 * than beside either one:
 *
 * - `services/axiosConfig.ts` — a 401 on some other request triggers a refresh
 *   attempt, and the interceptor rejects with the caller's original 401.
 * - `hooks/useSilentRefresh.ts` — the boot path, which calls
 *   `refreshTokenRequest()` directly and never touches the interceptor.
 *
 * The boot path is the one that matters most and was invisible longest: it runs
 * before anything else on every page load, so a `/auth/refresh` outage logs out
 * every signed-in user at once — and its `catch` reported nothing.
 *
 * The rule for what deserves an issue is NOT restated here. `isReportableFailure`
 * in `@beyou/api` owns it (5xx and transport failures yes, 4xx no) and web and
 * mobile have to agree on that boundary. The rejection is re-expressed as the
 * `ApiError` that classifier understands; a rejection with no recognisable
 * status passes through unwrapped, which `isReportableFailure` treats as a fault
 * in our own code — right for both "the connection never landed" and "the
 * refresh answered 200 with no token".
 */
export const reportRefreshFailure = (refreshError: unknown): void => {
    const status = responseStatus(refreshError);
    const subject =
        status === undefined
            ? refreshError
            : new ApiError(status, undefined, `Token refresh failed with HTTP ${status}`);

    if (isReportableFailure(subject)) {
        reportHandledFailure(subject);
    }
};

export default reportRefreshFailure;
