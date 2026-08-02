import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { MessageSquareWarning } from "lucide-react";
import type { RootState } from "@beyou/state/rootReducer";
import { useIsDesktop } from "../../hooks/useIsDesktop";

/**
 * Where the floating feedback bubble belongs, by route and by width:
 *
 *   route            | mobile (< lg) | desktop (>= lg)
 *   -----------------|---------------|----------------
 *   /feedback        | hidden        | hidden
 *   /configuration   | visible       | visible
 *   /dashboard       | hidden        | hidden
 *   everything else  | hidden        | visible
 *
 * Mobile is narrow on purpose. `BottomNav` is on every authenticated page now,
 * so Config is one tap from anywhere and Config carries the bubble — feedback
 * is two taps from any screen without spending a seventh slot in a six-item
 * bar (a seventh item has been declined twice). A bubble floating over every
 * small screen buys one tap and costs permanent screen furniture.
 *
 * Desktop has no bottom bar and the shared `Header` has no feedback affordance
 * — one was tried there and removed, because that header has a fixed shape
 * across every page — so the bubble stays the reach everywhere except the
 * dashboard, whose `Shortcuts` sidebar already carries a labelled feedback link.
 *
 * The width half of the decision is JS rather than a `lg:` class so the whole
 * rule reads in one place, and so tests can assert what renders instead of
 * which classes it carries.
 */
function shouldShow(pathname: string, isDesktop: boolean): boolean {
    // No point offering "send feedback" on the feedback form.
    if (pathname === "/feedback") return false;
    // The one page that always carries it: the mobile bar's destination.
    if (pathname === "/configuration") return true;
    // The dashboard's labelled sidebar shortcut is the entry on desktop; on
    // mobile the bar reaches Config from here like anywhere else.
    if (pathname === "/dashboard") return false;
    return isDesktop;
}

function FeedbackLauncher() {
    const { t } = useTranslation();
    const { pathname } = useLocation();
    const isDesktop = useIsDesktop();
    const isTutorialCompleted = useSelector(
        (state: RootState) => state.perfil.isTutorialCompleted
    );

    // Hidden until onboarding finishes, for the same reason the assistant FAB
    // is: the tutorial spotlight owns the screen, and a floating control outside
    // the highlight is noise a new user has to learn to ignore.
    if (!isTutorialCompleted) {
        return null;
    }

    if (!shouldShow(pathname, isDesktop)) {
        return null;
    }

    // `z-30` on purpose: above page content (which tops out at `z-20`) and below
    // every modal and the assistant panel (`z-40`/`z-50`), so an open dialog
    // covers it instead of the launcher floating over it. `bottom-36` clears
    // both the assistant FAB (`bottom-20`) and the bottom bar beneath it.
    return (
        <Link
            to="/feedback"
            aria-label={t("FeedbackNavLabel")}
            data-testid="feedback-fab"
            data-tutorial-id="feedback-fab"
            className="fixed bottom-36 right-4 z-30 flex h-11 w-11 items-center justify-center
            rounded-full border border-border bg-background text-primary shadow-md
            transition-transform duration-200 hover:scale-105 active:scale-95
            lg:bottom-24 lg:right-[1.375rem]"
        >
            <MessageSquareWarning size={20} aria-hidden="true" />
        </Link>
    );
}

export default FeedbackLauncher;
