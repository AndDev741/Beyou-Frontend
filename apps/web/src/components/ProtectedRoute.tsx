import { Navigate, Outlet } from "react-router-dom";
import axios from "../services/axiosConfig";
import type { AuthBootState } from "../hooks/useSilentRefresh";
import AgentWidget from "./agent/AgentWidget";

type Props = {
    authState: AuthBootState;
};

/**
 * Signed-in gate for every app route. The admin console needs a second,
 * narrower gate on top of this one: see `AdminRoute.tsx`, which nests inside
 * this route and lives in its own module so admin code stays out of the bundle
 * ordinary users download.
 *
 * `authState` is a one-shot boot check — it never updates after login.
 * Check the runtime axios token too: handleLogin sets it before navigating
 * to /dashboard, so a fresh ProtectedRoute mount sees the new credential.
 */
function ProtectedRoute({ authState }: Props) {
    const hasRuntimeToken = Boolean(axios.defaults.headers.common.Authorization);
    if (authState !== "authenticated" && !hasRuntimeToken) {
        return <Navigate to="/" replace />;
    }
    return (
        <>
            <Outlet />
            <AgentWidget />
        </>
    );
}

export default ProtectedRoute;
