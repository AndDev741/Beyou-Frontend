import { Plus } from "lucide-react";

type GhostAddProps = {
    label: string;
    onClick: () => void;
    className?: string;
    testId?: string;
    /** Âncora do tutorial (data-tutorial-id). */
    tutorialId?: string;
};

/** Convite discreto para adicionar dentro de uma lista (seção, item, categoria). */
export default function GhostAdd({ label, onClick, className = "", testId, tutorialId }: GhostAddProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            data-testid={testId}
            data-tutorial-id={tutorialId}
            className={`flex w-full items-center justify-center gap-2 rounded-control border border-dashed border-border py-2.5 text-sm font-semibold text-text-2 transition-colors duration-200 hover:border-accent hover:text-accent ${className}`}
        >
            <Plus size={16} aria-hidden="true" />
            {label}
        </button>
    );
}
