import type { ReactNode } from "react";

type IconTileProps = {
    children: ReactNode;
    size?: number;
    tone?: "accent" | "neutral";
    className?: string;
};

/** O tile atrás do ícone de hábito/tarefa/meta. A centralização é do componente. */
export default function IconTile({ children, size = 34, tone = "accent", className = "" }: IconTileProps) {
    return (
        <span
            className={`inline-flex shrink-0 items-center justify-center rounded-control ${
                tone === "accent" ? "bg-accent-soft text-accent" : "bg-surface-2 text-text-2"
            } ${className}`}
            style={{ width: size, height: size }}
        >
            {children}
        </span>
    );
}
