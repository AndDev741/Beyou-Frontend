import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type EmptyStateProps = {
    /** Ícone da entidade (Lucide). Nunca emoji: o vazio é parte do sistema. */
    icon: ReactNode;
    title: string;
    description?: string;
    actionLabel?: string;
    /** Rota da CTA. Sem ela, use `onAction`. */
    actionTo?: string;
    onAction?: () => void;
    /** Ação secundária discreta ("ou peça ao Assistente"). */
    secondaryLabel?: string;
    onSecondary?: () => void;
    /**
     * Busca ou filtro sem resultado: a CTA vira ghost. Não há o que criar —
     * o caminho é limpar o filtro, não um botão primário chamando atenção.
     */
    variant?: "default" | "ghost";
    testId?: string;
};

/**
 * Um componente, uma regra: IconTile com o ícone da entidade, título curto,
 * uma linha dizendo como preencher e uma única CTA.
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
    testId,
}: EmptyStateProps) {
    const ctaClass =
        variant === "ghost"
            ? "mt-4 rounded-control px-4 py-2 text-sm font-semibold text-accent transition-colors duration-200 hover:bg-accent-soft"
            : "mt-4 rounded-control bg-accent px-5 py-2 text-sm font-semibold text-on-accent transition-colors duration-200 hover:bg-accent-strong active:scale-[.98]";

    return (
        <div
            data-testid={testId}
            className="col-span-full flex w-full flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface p-8 text-center"
        >
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
