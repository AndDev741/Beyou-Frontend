import { Navigate, Outlet } from "react-router-dom";
import axios from "../services/axiosConfig";
import type { AuthBootState } from "../hooks/useSilentRefresh";
import AgentWidget from "./agent/AgentWidget";
import BottomNav from "./dashboard/BottomNav";
import Sidebar from "./shell/Sidebar";

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
        // The shell mounts ONCE for every authenticated route: sidebar on desktop,
        // bottom bar on phones. Pages no longer render a header of their own, and
        // the feedback bubble became a sidebar item — only the assistant's bubble
        // still floats.
        <div className="flex min-h-screen bg-bg">
            <Sidebar />
            <div className="min-w-0 flex-1">
                <Outlet />
                {/* `BottomNav` (phones) and the assistant's bubble (desktop) are
                    fixed and would cover the end of the page — on desktop the
                    bubble ate the last card's bottom border. The spacer lives here
                    with them: written once, so no page needs to know
                    que existem. */}
                <div className="h-20 lg:h-24" aria-hidden="true" data-testid="bottom-nav-spacer" />
            </div>
            <BottomNav />
            <AgentWidget />
        </div>
    );
}

export default ProtectedRoute;
