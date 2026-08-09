import type { ReactNode } from "react";

export type ChipVariant = "neutral" | "accent" | "xp" | "flame" | "time" | "ok" | "danger";

type ChipProps = {
    children: ReactNode;
    variant?: ChipVariant;
    size?: "sm" | "md";
    icon?: ReactNode;
    className?: string;
    title?: string;
};

/**
 * A data label: streak, XP, time, category, status.
 *
 * XP and time are NUMBERS, so they go in tabular mono — that is what keeps the
 * right-hand column of the routine items aligned.
 */
const VARIANTS: Record<ChipVariant, string> = {
    neutral: "bg-surface-2 text-text-2",
    accent: "bg-accent-soft text-accent",
    xp: "bg-xp-soft text-xp font-mono",
    flame: "bg-flame-soft text-flame",
    time: "bg-surface-2 text-text-3 font-mono",
    ok: "bg-success/10 text-success",
    danger: "bg-danger/10 text-danger",
};

export default function Chip({
    children,
    variant = "neutral",
    size = "md",
    icon,
    className = "",
    title,
}: ChipProps) {
    const sizing = size === "sm" ? "h-5 px-2 text-[11px] gap-1" : "h-6 px-2.5 text-xs gap-1.5";
    return (
        <span
            title={title}
            className={`inline-flex items-center rounded-full font-semibold leading-none ${sizing} ${VARIANTS[variant]} ${className}`}
        >
            {icon}
            {children}
        </span>
    );
}
