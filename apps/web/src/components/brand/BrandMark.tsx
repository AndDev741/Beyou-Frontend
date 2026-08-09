type BrandMarkProps = {
    /** The symbol's side in px. Ignored when `fluid`. */
    size?: number;
    /** The symbol follows the container width instead of a fixed side. */
    fluid?: boolean;
    /** Shows the "beyou" wordmark beside the symbol. */
    withWordmark?: boolean;
    className?: string;
};

/**
 * The brand symbol: a ring at 83% with the opening to the north-east and the check
 * pointing at it — the day closed, open for tomorrow.
 *
 * It is the SAME ring as the check-in, the level and the day's progress (see
 * `Ring`); if the two drift apart, the visual signature breaks. Below 20px the
 * stroke of 8 disappears, so the small variant thickens the stroke and shrinks the
 * radius.
 */
export default function BrandMark({ size = 32, fluid = false, withWordmark = false, className = "" }: BrandMarkProps) {
    const isSmall = size < 20;
    const stroke = isSmall ? 11 : 8;
    const radius = isSmall ? 23 : 24;
    const dash = isSmall ? "118 26.5" : "125 25.8";
    const check = isSmall ? "M21 33l8 8 15-15" : "M22 33l7 7 14-14";

    return (
        <span className={`inline-flex items-center gap-2.5 ${className}`}>
            <svg
                width={fluid ? undefined : size}
                height={fluid ? undefined : size}
                viewBox="0 0 64 64"
                role="img"
                aria-label="beyou"
                className={fluid ? "h-auto w-full" : "shrink-0"}
            >
                <circle
                    cx="32"
                    cy="32"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={dash}
                />
                <path
                    d={check}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            {withWordmark && (
                // Wordmark unified in lower case — the app alternated between
                // "Be you" and "Beyou" depending on the screen.
                <span
                    className="font-semibold tracking-[-0.02em]"
                    style={{ fontSize: Math.round(size * 0.86) }}
                >
                    beyou
                </span>
            )}
        </span>
    );
}
