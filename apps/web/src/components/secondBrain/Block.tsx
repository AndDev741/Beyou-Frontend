import { useId, type ReactNode } from "react";

type BlockProps = {
    title: string;
    /** One line under the title saying what the numbers are. */
    hint?: string;
    /** Sits to the right of the title: a link, a count, a quiet button. */
    action?: ReactNode;
    /** The one block that is asking for something gets the accent outline. */
    emphasis?: boolean;
    className?: string;
    testId?: string;
    children: ReactNode;
};

/**
 * One section of the Second Brain page. A labelled region, so a screen reader can jump from
 * block to block by heading instead of walking seven of them in a row.
 */
export default function Block({
    title,
    hint,
    action,
    emphasis = false,
    className = "",
    testId,
    children,
}: BlockProps) {
    const headingId = useId();
    return (
        <section
            aria-labelledby={headingId}
            data-testid={testId}
            className={`rounded-card border bg-surface p-5 lg:p-6 ${
                emphasis ? "border-accent/60" : "border-border"
            } ${className}`}
        >
            <header className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 id={headingId} className="text-[15px] font-semibold tracking-[-0.01em] text-text">
                        {title}
                    </h2>
                    {hint && <p className="mt-1 text-[13px] leading-snug text-text-2">{hint}</p>}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </header>
            {children}
        </section>
    );
}

type ShimmerProps = {
    /** Tailwind width classes, one per line, so the skeleton has the shape of what replaces it. */
    lines: string[];
    label: string;
    className?: string;
};

/** Text-shaped placeholder on the app's own shimmer keyframe. */
export function Shimmer({ lines, label, className = "" }: ShimmerProps) {
    return (
        <div role="status" aria-label={label} aria-busy="true" className={`flex flex-col gap-2.5 ${className}`}>
            {lines.map((width, index) => (
                <span
                    key={`${width}-${index}`}
                    className={`relative block h-3.5 overflow-hidden rounded-full bg-surface-2 ${width}`}
                >
                    <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-border to-transparent" />
                </span>
            ))}
        </div>
    );
}
