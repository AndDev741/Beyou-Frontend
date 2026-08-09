import { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { RootState } from "@beyou/state/rootReducer";
import { onAgentPanelOpen } from "./agentPanelBus";

// Lazy: react-markdown and the whole chat surface stay out of the boot
// bundle until the first FAB click.
const AgentPanel = lazy(() => import("./AgentPanel"));

/**
 * Global AI assistant entry point, mounted once inside ProtectedRoute so it
 * follows the user across every authenticated page. The panel stays mounted
 * after the first open — navigating or closing never loses the conversation.
 */
function AgentWidget() {
    const { t } = useTranslation();
    const reducedMotion = useReducedMotion();
    const isTutorialCompleted = useSelector(
        (state: RootState) => state.perfil.isTutorialCompleted,
    );
    const [open, setOpen] = useState(false);
    const [hasOpened, setHasOpened] = useState(false);

    const openPanel = () => {
        setHasOpened(true);
        setOpen(true);
    };

    // The bottom bar's centre button is the phone trigger; it asks for the
    // panel through an event because the state lives here.
    //
    // The subscription is gated on the tutorial too, not just the render: a tap
    // during onboarding used to set `open` silently, and the chat popped by
    // itself the moment the tutorial finished. Mirrors the native widget.
    useEffect(() => {
        if (!isTutorialCompleted) return;
        return onAgentPanelOpen(openPanel);
    }, [isTutorialCompleted]);

    // Hidden until onboarding finishes: the tutorial (manual or AI) should own
    // the user's attention, and the AI wizard already covers assisted setup.
    if (!isTutorialCompleted) {
        return null;
    }

    return (
        <>
            {hasOpened && (
                <Suspense fallback={null}>
                    <AgentPanel open={open} onClose={() => setOpen(false)} />
                </Suspense>
            )}

            {/* The FAB hides while the panel is open so the chat owns that corner. */}
            {!open && (
                <button
                    type="button"
                    aria-label={t("OpenAssistant")}
                    onClick={openPanel}
                    data-tutorial-id="agent-fab"
                    className="fixed bottom-20 right-4 z-[60] hidden h-14 w-14 items-center
                    justify-center rounded-full bg-accent text-on-accent shadow-lg shadow-accent/40
                    transition-transform duration-200 hover:scale-105 active:scale-95
                    lg:bottom-6 lg:right-6 lg:flex"
                >
                    {!reducedMotion && (
                        <span
                            aria-hidden
                            className="absolute inset-0 animate-agent-breathe rounded-full bg-accent"
                        />
                    )}
                    <span className="relative">
                        <Sparkles size={24} />
                    </span>
                </button>
            )}
        </>
    );
}

export default AgentWidget;
