import type { ReactNode } from "react";

type StatTileProps = {
    label: string;
    value: ReactNode;
    /** Linha de apoio: "melhor: 21", "desde mar". */
    hint?: string;
    className?: string;
};

/** Bloco de número da tela estendida (nível, constância, check-ins). */
export default function StatTile({ label, value, hint, className = "" }: StatTileProps) {
    return (
        <div className={`rounded-control border border-border bg-surface px-3 py-2.5 ${className}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-3">{label}</p>
            <p className="mt-0.5 font-mono text-lg font-semibold text-text">{value}</p>
            {hint && <p className="text-[11px] text-text-3">{hint}</p>}
        </div>
    );
}
