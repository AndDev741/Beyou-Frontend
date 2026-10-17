import { useId } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import type { DiagramSpec } from "@beyou/types/notebook/diagram";
import Modal from "../../modals/Modal";
import DiagramView from "./DiagramView";
import { useDiagramMeta } from "./DiagramCard";

/**
 * A diagram on (nearly) the whole screen, laid out for the room it has. The shared Modal gives it
 * Escape, the focus trap and focus back to the button that opened it.
 */
export default function DiagramFullscreen({ spec, isOpen, onClose }: { spec: DiagramSpec | null; isOpen: boolean; onClose: () => void }) {
    const { t } = useTranslation();
    const titleId = useId();
    const meta = useDiagramMeta(spec);

    return (
        <Modal isOpen={isOpen} onClose={onClose} labelledBy={titleId} className="!max-h-[94vh] !max-w-[min(1280px,96vw)]">
            <div data-testid="diagram-fullscreen-view" className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <h2 id={titleId} className="text-lg font-semibold text-text">{spec?.title || t("DiagramUntitled")}</h2>
                        {meta && <span className="text-[13px] text-text-2">{meta}</span>}
                    </div>
                    <button type="button" onClick={onClose} aria-label={t("DiagramCloseFullscreen")} data-testid="diagram-fullscreen-close"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-text-2 hover:bg-surface-2 hover:text-text">
                        <X size={18} aria-hidden="true" />
                    </button>
                </div>
                <div className="rounded-[12px] bg-bg px-2 py-4 md:px-4">
                    <DiagramView spec={spec} maxScale={1.6} />
                </div>
            </div>
        </Modal>
    );
}
