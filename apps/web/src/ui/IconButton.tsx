import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    /** Obrigatório: o botão não tem texto visível. */
    label: string;
    tone?: "default" | "danger";
};

/** Ação discreta (editar, excluir, fechar). Sempre com rótulo acessível. */
export default function IconButton({
    children,
    label,
    tone = "default",
    className = "",
    ...rest
}: IconButtonProps) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-control text-text-3 transition-colors duration-200 hover:bg-surface-2 ${
                tone === "danger" ? "hover:text-danger" : "hover:text-text"
            } disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
            {...rest}
        >
            {children}
        </button>
    );
}
