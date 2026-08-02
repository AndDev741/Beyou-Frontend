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
            className="col-span-full flex w-full flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface p-8 text-center"
        >
            <span
                className="mb-3 flex h-12 w-12 items-center justify-center rounded-control bg-accent-soft text-2xl"
                aria-hidden="true"
            >
                {emoji}
            </span>
            <p className="text-lg font-semibold text-text">{title}</p>
            {description && <p className="mt-2 max-w-md text-sm text-text-2">{description}</p>}
            {actionLabel && actionTo && (
                <Link
                    to={actionTo}
                    className="mt-4 rounded-control bg-accent px-5 py-2 text-sm font-semibold text-on-accent transition-colors duration-200 hover:bg-accent-strong active:scale-[.98]"
                >
                    {actionLabel}
                </Link>
            )}
        </div>
    );
}
