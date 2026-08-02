import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
    children: ReactNode;
    /** Reage a hover/foco — para cartões clicáveis de lista. */
    interactive?: boolean;
    /** Destaca o cartão com o acento (item selecionado, meta concluída usa `tone`). */
    selected?: boolean;
    tone?: "default" | "success";
    padded?: boolean;
};

/**
 * A superfície do sistema. Substitui o par `bg-background + border-primary`
 * copiado em cada cartão — o redesign troca contorno azul por superfície.
 */
export default function Card({
    children,
    interactive = false,
    selected = false,
    tone = "default",
    padded = true,
    className = "",
    ...rest
}: CardProps) {
    const border = selected
        ? "border-accent"
        : tone === "success"
          ? "border-success"
          : "border-border";
    return (
        <div
            className={`rounded-card border bg-surface ${border} ${padded ? "p-4" : ""} ${
                interactive
                    ? "transition-colors duration-200 hover:border-text-3/60 focus-within:border-accent"
                    : ""
            } ${className}`}
            {...rest}
        >
            {children}
        </div>
    );
}
