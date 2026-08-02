type BrandMarkProps = {
    /** Lado do símbolo em px. */
    size?: number;
    /** Mostra o wordmark "beyou" ao lado do símbolo. */
    withWordmark?: boolean;
    className?: string;
};

/**
 * O símbolo da marca: anel a 83% com a abertura no nordeste e o check
 * apontando para ela — o dia fechado, aberto para amanhã.
 *
 * É o MESMO anel do check-in, do nível e do progresso do dia (ver `Ring`); se
 * os dois divergirem, a assinatura visual quebra. Abaixo de 20px o traço de 8
 * some, então a variante pequena engrossa o traço e reduz o raio.
 */
export default function BrandMark({ size = 32, withWordmark = false, className = "" }: BrandMarkProps) {
    const isSmall = size < 20;
    const stroke = isSmall ? 11 : 8;
    const radius = isSmall ? 23 : 24;
    const dash = isSmall ? "118 26.5" : "125 25.8";
    const check = isSmall ? "M21 33l8 8 15-15" : "M22 33l7 7 14-14";

    return (
        <span className={`inline-flex items-center gap-2.5 ${className}`}>
            <svg
                width={size}
                height={size}
                viewBox="0 0 64 64"
                role="img"
                aria-label="beyou"
                className="shrink-0"
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
                // Wordmark unificado em minúsculo — o app alternava "Be you" e
                // "Beyou" dependendo da tela.
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
