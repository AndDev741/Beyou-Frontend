import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
    children: ReactNode;
    /** Reacts to hover/focus — for clickable list cards. */
    interactive?: boolean;
    /** Highlights the card with the accent (selected item; a done goal uses `tone`). */
    selected?: boolean;
    tone?: "default" | "success";
    padded?: boolean;
};

/**
 * The system's surface. Replaces the `bg-surface + border-primary` pair copied into
 * every card — the redesign trades a blue outline for a surface.
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
