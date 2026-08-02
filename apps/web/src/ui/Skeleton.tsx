type SkeletonProps = {
    className?: string;
    /** Altura em px quando não vier por classe. */
    height?: number;
    rounded?: "control" | "card" | "full";
};

/**
 * Regra de sistema do mockup: o skeleton ESPELHA o cartão que substitui — não
 * existe spinner no meio do conteúdo. Spinner central fica só no gate de
 * autenticação do boot, onde ainda não há layout para espelhar.
 *
 * O shimmer é desligado sob `prefers-reduced-motion` (ver index.css).
 */
export default function Skeleton({ className = "", height, rounded = "control" }: SkeletonProps) {
    const radius =
        rounded === "full" ? "rounded-full" : rounded === "card" ? "rounded-card" : "rounded-control";
    return (
        <span
            aria-hidden="true"
            style={height ? { height } : undefined}
            className={`relative block overflow-hidden bg-surface-2 ${radius} ${className}`}
        >
            <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-text-3/10 to-transparent motion-reduce:animate-none" />
        </span>
    );
}
