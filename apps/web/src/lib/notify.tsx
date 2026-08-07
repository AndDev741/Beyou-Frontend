import type { ReactNode } from "react";
import { toast, type CloseButtonProps, type IconProps, type ToastOptions } from "react-toastify";
import { Check, CircleAlert, Info, TriangleAlert, X } from "lucide-react";

/**
 * NOTIFY do mockup: borda esquerda no tom, ícone da entidade, título e um
 * subtítulo opcional. O tempo é uma linha de 2px sem trilho, no rodapé.
 *
 * Toda notificação passa pelo mesmo container do `App`, então os `toast.*`
 * antigos (só texto) já herdam a casca nova; o `notify` existe para quando a
 * mensagem tem ícone próprio ou segunda linha.
 */

const TILE_BY_TYPE: Record<string, string> = {
    success: "bg-success/12 text-success",
    error: "bg-danger/12 text-danger",
    warning: "bg-flame/15 text-flame",
    info: "bg-accent-soft text-accent",
    default: "bg-accent-soft text-accent",
};

function tileClass(type: string) {
    return `flex h-8 w-8 shrink-0 items-center justify-center rounded-control ${
        TILE_BY_TYPE[type] ?? TILE_BY_TYPE.default
    }`;
}

/** Ícone padrão por tom, usado quando quem chama não manda o da entidade. */
export function ToastTypeIcon({ type }: IconProps) {
    const glyph =
        type === "success" ? (
            <Check size={16} aria-hidden="true" />
        ) : type === "error" ? (
            <CircleAlert size={16} aria-hidden="true" />
        ) : type === "warning" ? (
            <TriangleAlert size={16} aria-hidden="true" />
        ) : (
            <Info size={16} aria-hidden="true" />
        );

    return <span className={tileClass(type)}>{glyph}</span>;
}

export function ToastCloseButton({ closeToast, ariaLabel }: CloseButtonProps) {
    return (
        <button
            type="button"
            aria-label={ariaLabel || "Close"}
            onClick={closeToast}
            className="ml-1 mt-0.5 self-start rounded-md p-1 text-text-3 transition-colors duration-200 hover:bg-surface-2 hover:text-text-2"
        >
            <X size={14} aria-hidden="true" />
        </button>
    );
}

function ToastBody({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
    return (
        <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-snug text-text">{title}</p>
            {subtitle ? (
                <p className="mt-0.5 text-[12px] leading-snug text-text-3">{subtitle}</p>
            ) : null}
        </div>
    );
}

type NotifyOptions = Omit<ToastOptions, "icon"> & {
    subtitle?: ReactNode;
    /** Ícone da entidade — o hábito marcado, a meta concluída. */
    icon?: ReactNode;
};

function show(
    type: "success" | "error" | "info" | "warning",
    title: ReactNode,
    { subtitle, icon, ...options }: NotifyOptions = {}
) {
    return toast[type](<ToastBody title={title} subtitle={subtitle} />, {
        ...options,
        ...(icon ? { icon: () => <span className={tileClass(type)}>{icon}</span> } : {}),
    });
}

export const notify = {
    success: (title: ReactNode, options?: NotifyOptions) => show("success", title, options),
    error: (title: ReactNode, options?: NotifyOptions) => show("error", title, options),
    info: (title: ReactNode, options?: NotifyOptions) => show("info", title, options),
    warning: (title: ReactNode, options?: NotifyOptions) => show("warning", title, options),
};
