import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { MessageSquareWarning } from "lucide-react";
import type { RootState } from "@beyou/state/rootReducer";

/**
 * R1: feedback reachable from EVERY authenticated page.
 *
 * It used to live in the dashboard's shortcut grid alone, which made it
 * reachable from one page of seven — the other six render the shared `Header`,
 * which is a title, an optional logout and a return-to-dashboard icon. A user
 * who hit a problem on habits or routines had to navigate away from the thing
 * they wanted to report before they could report it.
 *
 * Deliberately NOT a header icon: one was tried there and removed, because the
 * shared header has a fixed shape across every page and an extra control breaks
 * it. This is the mount the app already uses for exactly this problem —
 * `ProtectedRoute` renders it beside `AgentWidget`, the same way the mobile app
 * mounts its own `FeedbackLauncher` in the `(app)` layout — so it follows the
 * user across routes without any page knowing it exists.
 *
 * `z-30` on purpose: above page content (which tops out at `z-20`) and below
 * every modal and the assistant panel (`z-40`/`z-50`), so an open dialog covers
 * it instead of the launcher floating over it.
 */
function FeedbackLauncher() {
    const { t } = useTranslation();
    const { pathname } = useLocation();
    const isTutorialCompleted = useSelector(
        (state: RootState) => state.perfil.isTutorialCompleted
    );

    // Hidden until onboarding finishes, for the same reason the assistant FAB
    // is: the tutorial spotlight owns the screen, and a floating control outside
    // the highlight is noise a new user has to learn to ignore.
    if (!isTutorialCompleted) {
        return null;
    }

    // Routes that already carry their own entry point. The dashboard has the
    // labelled shortcut in its sidebar, which is the discoverable one — a
    // floating bubble beside it is two controls for one action on one screen.
    // The launcher exists for the OTHER authenticated routes, whose shared
    // header has no feedback affordance.
    if (pathname === "/feedback" || pathname === "/dashboard") {
        return null;
    }

    return (
        <Link
            to="/feedback"
            aria-label={t("FeedbackNavLabel")}
            data-testid="feedback-fab"
            data-tutorial-id="feedback-fab"
            className="fixed bottom-36 right-4 z-30 flex h-11 w-11 items-center justify-center
            rounded-full border border-primary bg-background text-primary shadow-md
            transition-transform duration-200 hover:scale-105 active:scale-95
            lg:bottom-24 lg:right-[1.375rem]"
        >
            <MessageSquareWarning size={20} aria-hidden="true" />
        </Link>
    );
}

export default FeedbackLauncher;
