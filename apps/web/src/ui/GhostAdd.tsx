import { Plus } from "lucide-react";

type GhostAddProps = {
    label: string;
    onClick: () => void;
    className?: string;
    testId?: string;
    /** The tutorial's anchor (data-tutorial-id). */
    tutorialId?: string;
};

/** A quiet invitation to add inside a list (section, item, category). */
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
