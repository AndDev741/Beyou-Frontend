import { Navigate, Outlet } from "react-router-dom";
import axios from "../services/axiosConfig";
import type { AuthBootState } from "../hooks/useSilentRefresh";
import AgentWidget from "./agent/AgentWidget";

type Props = {
    authState: AuthBootState;
};

/**
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
