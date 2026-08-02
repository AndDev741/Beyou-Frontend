import { Link } from "react-router-dom";

type EmptyStateProps = {
    emoji: string;
    title: string;
    description?: string;
    actionLabel?: string;
    actionTo?: string;
    testId?: string;
};

export default function EmptyState({ emoji, title, description, actionLabel, actionTo, testId }: EmptyStateProps) {
    return (
        <div
            data-testid={testId}
            className="col-span-full flex w-full flex-col items-center justify-center rounded-card border-2 border-border bg-surface p-8 text-center shadow-sm"
        >
            <p className="mb-3 text-5xl" aria-hidden="true">{emoji}</p>
            <p className="text-lg font-semibold text-text">{title}</p>
            {description && <p className="mt-2 max-w-md text-sm text-text-2">{description}</p>}
            {actionLabel && actionTo && (
                <Link
                    to={actionTo}
                    className="mt-4 rounded-[20px] bg-accent px-6 py-2 font-semibold text-on-accent transition-all duration-200 hover:bg-accent/90 active:scale-95"
                >
                    {actionLabel}
                </Link>
            )}
        </div>
    );
}
