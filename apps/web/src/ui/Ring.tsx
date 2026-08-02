import { Check, X } from "lucide-react";

export type RingState = "todo" | "done" | "skipped" | "progress";

type RingProps = {
    /** Lado em px. */
    size?: number;
    /** 0..1 — só usado quando `state` é "progress". */
    progress?: number;
    state?: RingState;
    /** Rótulo central (nível, porcentagem). Ignorado quando há check. */
    label?: string;
    className?: string;
    title?: string;
};

/**
 * O anel do sistema: check-in, nível, progresso do dia e logo são a MESMA peça.
 * Se divergirem, a assinatura da marca quebra (ver `BrandMark`, que usa a mesma
 * geometria com a abertura no nordeste).
 *
 * O traço acompanha o tamanho — um anel de 20px com traço fixo de 3 vira uma
 * bolha; um de 96 com o mesmo traço vira um fio.
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
                // Contraste conferido nos dois temas: borda em text-3 e ícone em
                // text-2 (no mockup v1.18 o ícone sumia no escuro).
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
