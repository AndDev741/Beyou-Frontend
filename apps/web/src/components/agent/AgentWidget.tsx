import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";

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
    const [open, setOpen] = useState(false);
    const [hasOpened, setHasOpened] = useState(false);

    const openPanel = () => {
        setHasOpened(true);
        setOpen(true);
    };

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
                    className="fixed bottom-20 right-4 z-[60] flex h-14 w-14 items-center
                    justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40
                    transition-transform duration-200 hover:scale-105 active:scale-95
                    lg:bottom-6 lg:right-6"
                >
                    {!reducedMotion && (
                        <span
                            aria-hidden
                            className="absolute inset-0 animate-agent-breathe rounded-full bg-primary"
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
