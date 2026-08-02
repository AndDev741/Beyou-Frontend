type XpBarProps = {
    /** XP acumulado dentro do nível atual. */
    current: number;
    /** XP necessário para o próximo nível. */
    target: number;
    level?: number;
    /** Esconde os números (uso em cartão compacto). */
    compact?: boolean;
    className?: string;
};

/** Barra de XP + chip de nível. Números sempre em mono tabular. */
export default function XpBar({ current, target, level, compact = false, className = "" }: XpBarProps) {
    // target 0 aconteceria num nível recém-criado e dividiria por zero.
    const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    return (
        <div className={className}>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                    className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                    style={{ width: `${pct}%` }}
                />
            </div>
            {!compact && (
                <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-text-3">
                    {level !== undefined && <span className="font-semibold text-text-2">LV {level}</span>}
                    <span>
                        {current}/{target}
                    </span>
                </div>
            )}
        </div>
    );
}
