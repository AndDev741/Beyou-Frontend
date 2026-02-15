import { ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    className?: string;
    dataTutorialId?: string;
};

function Modal({ isOpen, onClose, children, className, dataTutorialId }: ModalProps) {
    if (!isOpen) return null;

    const content = (
        <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div
                className={`bg-background text-secondary border border-primary/20 rounded-lg shadow-lg p-5 md:p-8 w-[95vw] max-w-xl max-h-[90vh] overflow-y-auto relative transition-colors duration-200 ${className ?? ""}`}
                data-tutorial-id={dataTutorialId}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
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
