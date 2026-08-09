import { Check, X } from "lucide-react";

export type RingState = "todo" | "done" | "skipped" | "progress";

type RingProps = {
    /** Lado em px. */
    size?: number;
    /** 0..1 — only used when `state` is "progress". */
    progress?: number;
    state?: RingState;
    /** Centre label (level, percentage). Ignored when a check is drawn. */
    label?: string;
    className?: string;
    title?: string;
};

/**
 * The system's ring: check-in, level, day progress and the logo are the SAME
 * piece. If they drift apart the brand signature breaks (see `BrandMark`, which
 * uses the same geometry with the gap to the north-east).
 *
 * The stroke follows the size — a 20px ring with a fixed stroke of 3 turns into a
 * blob; a 96px one with the same stroke turns into a thread.
 */
export default function Ring({
    size = 24,
    progress = 0,
    state = "todo",
    label,
    className = "",
    title,
}: RingProps) {
    const stroke = Math.max(2, Math.round(size * 0.11));
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.min(1, Math.max(0, progress));

    const trackClass = state === "skipped" ? "stroke-text-3/40" : "stroke-border";
    const valueClass =
        state === "done" ? "stroke-accent" : state === "skipped" ? "stroke-text-3" : "stroke-accent";

    return (
        <span
            className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
            style={{ width: size, height: size }}
            title={title}
        >
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={stroke}
                    className={trackClass}
                />
                {(state === "done" || state === "progress") && (
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        className={valueClass}
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - (state === "done" ? 1 : clamped))}
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                        style={{ transition: "stroke-dashoffset .5s ease-out" }}
                    />
                )}
            </svg>

            {state === "done" && (
                <Check
                    size={Math.round(size * 0.5)}
                    strokeWidth={3}
                    className="absolute text-accent"
                    aria-hidden="true"
                />
            )}
            {state === "skipped" && (
                // Contrast checked in both themes: border in text-3 and icon in
                // text-2 (in mockup v1.18 the icon vanished in the dark).
                <X
                    size={Math.round(size * 0.44)}
                    strokeWidth={3}
                    className="absolute text-text-2"
                    aria-hidden="true"
                />
            )}
            {label && state === "progress" && (
                <span
                    className="absolute font-mono font-semibold text-text"
                    style={{ fontSize: Math.max(9, Math.round(size * 0.26)) }}
                >
                    {label}
                </span>
            )}
        </span>
    );
}
