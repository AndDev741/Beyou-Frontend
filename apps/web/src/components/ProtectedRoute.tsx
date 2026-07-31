import { Navigate, Outlet } from "react-router-dom";
import axios from "../services/axiosConfig";
import type { AuthBootState } from "../hooks/useSilentRefresh";
import AgentWidget from "./agent/AgentWidget";
import BottomNav from "./dashboard/BottomNav";
import FeedbackLauncher from "./feedback/FeedbackLauncher";

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
            {/* `BottomNav` is `fixed`, so it overlays the page instead of
                pushing it and would cover whatever ends each page. The spacer
                belongs with the bar, not with the pages: mounted here it is
                written once and no page has to know the bar exists — the
                alternative is the same `h-20` repeated in all eight of them,
                where the next page added would silently miss it. `lg:hidden`
                on both, so desktop gets neither the bar nor the gap. */}
            <div className="h-20 lg:hidden" aria-hidden="true" data-testid="bottom-nav-spacer" />
            {/* On mobile this bar IS the shortcuts affordance — desktop keeps
                the labelled <Shortcuts/> sidebar on the dashboard. It lives
                here rather than on the dashboard so every authenticated page
                can move sideways in one tap instead of routing back through
                the dashboard first. */}
            <BottomNav />
            <AgentWidget />
            {/* R1: mounted here, not per page, so feedback follows the user.
                Which routes and widths it actually appears on is the component's
                own decision — see the table in `FeedbackLauncher`. Mirrors the
                mobile app's `(app)` layout. */}
            <FeedbackLauncher />
        </>
    );
}

export default ProtectedRoute;
