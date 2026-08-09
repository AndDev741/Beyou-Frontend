import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

type EmptyStateProps = {
    /** The entity's icon (Lucide). Never an emoji: the empty state is system. */
    icon: ReactNode;
    title: string;
    description?: string;
    actionLabel?: string;
    /** The CTA's route. Without it, use `onAction`. */
    actionTo?: string;
    onAction?: () => void;
    /** Quiet secondary action ("or ask the Assistant"). */
    secondaryLabel?: string;
    onSecondary?: () => void;
    /**
     * A search or filter with no result: the CTA turns ghost. There is nothing
     * to create — the way out is clearing the filter, not a primary button
     * demanding attention.
     */
    variant?: "default" | "ghost";
    /** When given, shows the × that dismisses the invitation for good. */
    onDismiss?: () => void;
    testId?: string;
};

/**
 * One component, one rule: an IconTile with the entity's icon, a short title, one
 * line saying how to fill it, and a single CTA.
 */
export default function EmptyState({
    icon,
    title,
    description,
    actionLabel,
    actionTo,
    onAction,
    secondaryLabel,
    onSecondary,
    variant = "default",
    onDismiss,
    testId,
}: EmptyStateProps) {
    const { t } = useTranslation();
    const ctaClass =
        variant === "ghost"
            ? "mt-4 rounded-control px-4 py-2 text-sm font-semibold text-accent transition-colors duration-200 hover:bg-accent-soft"
            : "mt-4 rounded-control bg-accent px-5 py-2 text-sm font-semibold text-on-accent transition-colors duration-200 hover:bg-accent-strong active:scale-[.98]";

    return (
        <div
            data-testid={testId}
            className="relative col-span-full flex w-full flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface p-8 text-center"
        >
            {onDismiss && (
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label={t("Dismiss")}
                    className="absolute right-2.5 top-2.5 rounded-md p-1.5 text-text-3 transition-colors duration-200 hover:bg-surface-2 hover:text-text-2"
                >
                    <X size={15} aria-hidden="true" />
                </button>
            )}
            <span
                className="mb-3 flex h-11 w-11 items-center justify-center rounded-control bg-accent-soft text-accent"
                aria-hidden="true"
            >
                {icon}
            </span>
            <p className="text-[15px] font-semibold text-text">{title}</p>
            {description && <p className="mt-1.5 max-w-xs text-[12.5px] text-text-3">{description}</p>}

            {actionLabel && actionTo && (
                <Link to={actionTo} className={ctaClass}>
                    {actionLabel}
                </Link>
            )}
            {actionLabel && !actionTo && onAction && (
                <button type="button" onClick={onAction} className={ctaClass}>
                    {actionLabel}
                </button>
            )}

            {secondaryLabel && onSecondary && (
                <button
                    type="button"
                    onClick={onSecondary}
                    className="mt-2 text-[12.5px] font-semibold text-accent transition-colors duration-200 hover:underline"
                >
                    {secondaryLabel}
                </button>
            )}
        </div>
    );
}
