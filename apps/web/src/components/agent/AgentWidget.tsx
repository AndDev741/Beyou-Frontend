import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { useReducedMotion } from "framer-motion";
import { Sparkles, X } from "lucide-react";

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

    const toggle = () => {
        setHasOpened(true);
        setOpen((v) => !v);
    };

    return (
        <>
            {hasOpened && (
                <Suspense fallback={null}>
                    <AgentPanel open={open} onClose={() => setOpen(false)} />
                </Suspense>
            )}

            <button
                type="button"
                aria-label={open ? t("CloseAssistant") : t("OpenAssistant")}
                aria-expanded={open}
                onClick={toggle}
                data-tutorial-id="agent-fab"
                className={`fixed right-4 z-[60] h-14 w-14 items-center justify-center rounded-full
                bg-primary text-white shadow-lg shadow-primary/40 transition-transform duration-200
                hover:scale-105 active:scale-95 lg:right-6
                bottom-20 lg:bottom-6 ${open ? "hidden lg:flex" : "flex"}`}
            >
                {!open && !reducedMotion && (
                    <span
                        aria-hidden
                        className="absolute inset-0 animate-agent-breathe rounded-full bg-primary"
                    />
                )}
                <span className="relative transition-transform duration-200">
                    {open ? <X size={24} /> : <Sparkles size={24} />}
                </span>
            </button>
        </>
    );
}

export default AgentWidget;
