import { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    className?: string;
    dataTutorialId?: string;
    /** id of the element that labels the dialog (aria-labelledby). */
    labelledBy?: string;
};

const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function Modal({ isOpen, onClose, children, className, dataTutorialId, labelledBy }: ModalProps) {
    const dialogRef = useRef<HTMLDivElement>(null);

    // Focus management: on open, move focus into the dialog; on close, give it
    // back to whatever had it before (so keyboard users don't lose their place).
    useEffect(() => {
        if (!isOpen) return;
        const previouslyFocused = document.activeElement as HTMLElement | null;
        const dialog = dialogRef.current;
        const firstFocusable = dialog?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        (firstFocusable ?? dialog)?.focus();
        return () => {
            previouslyFocused?.focus?.();
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === "Escape") {
            event.stopPropagation();
            onClose();
            return;
        }
        if (event.key !== "Tab") return;

        // Focus trap: cycle Tab/Shift+Tab within the dialog instead of letting
        // focus escape to the page underneath.
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
        if (focusables.length === 0) {
            event.preventDefault();
            return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;

        if (event.shiftKey && (active === first || active === dialog)) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
        }
    };

    const content = (
        <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-[110]"
            onClick={onClose}
        >
            <div
                ref={dialogRef}
                tabIndex={-1}
                className={`bg-background text-secondary border border-primary/20 rounded-lg shadow-lg p-5 md:p-8 w-[95vw] max-w-xl max-h-[90vh] overflow-y-auto relative transition-colors duration-200 ${className ?? ""}`}
                data-tutorial-id={dataTutorialId}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleKeyDown}
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
            >
                {children}
            </div>
        </div>
    );

    if (typeof document !== "undefined") {
        return createPortal(content, document.body);
    }

    return content;
}

export default Modal;
