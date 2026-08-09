type XpBarProps = {
    /** XP accumulated inside the current level. */
    current: number;
    /** XP needed for the next level. */
    target: number;
    level?: number;
    /** Hides the numbers (for a compact card). */
    compact?: boolean;
    className?: string;
};

/** XP bar + level chip. Numbers always in tabular mono. */
export default function XpBar({ current, target, level, compact = false, className = "" }: XpBarProps) {
    // A target of 0 would happen on a freshly created level and divide by zero.
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
