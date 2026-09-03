import { Suspense } from "react";
import { Navigate, Outlet } from "react-router-dom";
import axios from "../services/axiosConfig";
import type { AuthBootState } from "../hooks/useSilentRefresh";
import AgentWidget from "./agent/AgentWidget";
import BottomNav from "./dashboard/BottomNav";
import Sidebar from "./shell/Sidebar";
import RunningTimerHub from "./focus/RunningTimerHub";
import PomodoroOwner from "./focus/PomodoroOwner";

type Props = {
    authState: AuthBootState;
};

/**
 * Where the page area waits for its chunk. Same drawing as the boot spinner in App.tsx, sized
 * to the page instead of the screen, so the shell around it stays where it was.
 */
function PageFallback() {
    return (
        <div className="flex min-h-[60vh] items-center justify-center" data-testid="page-fallback">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-border border-t-transparent" />
        </div>
    );
}

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
                {/*
                 * The Suspense boundary for page chunks lives HERE, around the page alone, and
                 * that placement is load-bearing. Every page is a `React.lazy` chunk. When the
                 * only boundary sat above this component, in App.tsx, the first visit to any
                 * page hid the entire shell while the chunk came down: sidebar, bottom bar, the
                 * assistant bubble and its open panel. React tears down layout effects on a
                 * Suspense hide, and framer-motion keeps its animation state in one, so a panel
                 * that was mid-exit at that moment lost its animation and never told
                 * `AnimatePresence` it had finished. On reveal it came back at full opacity
                 * while `AgentWidget` already held `open: false`: the bubble drew over the chat,
                 * Escape did nothing, and the next tap on the bubble "reopened" a panel that
                 * had never left. The agent's own internal links close and navigate in one
                 * tick, which is exactly that sequence, once per page per session.
                 *
                 * With the boundary in here a loading page can only ever blank the page area.
                 * Auth pages keep the App.tsx boundary; nothing of theirs outlives a route.
                 */}
                <Suspense fallback={<PageFallback />}>
                    <Outlet />
                </Suspense>
                {/* `BottomNav` (phones) and the assistant's bubble (desktop) are
                    fixed and would cover the end of the page — on desktop the
                    bubble ate the last card's bottom border. The spacer lives here
                    with them: written once, so no page needs to know
                    que existem. */}
                <div className="h-20 lg:h-24" aria-hidden="true" data-testid="bottom-nav-spacer" />
            </div>
            <BottomNav />
            <AgentWidget />
            {/* Rides every authenticated route, and hides itself on /focus. Renders nothing at
                all unless a cycle is actually running or paused. */}
            <RunningTimerHub />
            {/* Finishes and reports a cycle wherever the person is. Renders nothing. */}
            <PomodoroOwner />
        </div>
    );
}

export default ProtectedRoute;
