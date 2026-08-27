type Option<T extends string | number> = {
    value: T;
    label: string;
    disabled?: boolean;
    /**
     * A line under the label saying what the option means. Optional: adding one to any
     * option switches the whole control to the taller two-line layout, so that segments
     * with and without a description still line up.
     */
    description?: string;
};

type SegmentedControlProps<T extends string | number> = {
    options: Option<T>[];
    value: T;
    onChange: (value: T) => void;
    label: string;
    size?: "sm" | "md";
    className?: string;
};

/**
 * A short single choice (importance, difficulty, experience, mode). Replaces the
 * selects and the loose button rows every form used to reinvent.
 */
export default function SegmentedControl<T extends string | number>({
    options,
    value,
    onChange,
    label,
    size = "md",
    className = "",
}: SegmentedControlProps<T>) {
    const hasDescriptions = options.some((option) => option.description);
    const pad = hasDescriptions
        ? "px-3 py-2 text-sm"
        : size === "sm"
          ? "px-3 py-1 text-xs"
          : "px-4 py-1.5 text-sm";
    return (
        <div
            role="radiogroup"
            aria-label={label}
            className={`inline-flex rounded-control border border-border bg-surface-2 p-[3px] ${className}`}
        >
            {options.map((option) => {
                const isActive = option.value === value;
                return (
                    <button
                        key={String(option.value)}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        disabled={option.disabled}
                        onClick={() => onChange(option.value)}
                        className={`flex-1 rounded-[7px] font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-45 ${pad} ${
                            // Top-aligned, not centred: the segments stretch to a shared
                            // height, so a description that wraps to two lines would
                            // otherwise push its own label off the other's baseline.
                            hasDescriptions ? "flex flex-col justify-start text-left" : ""
                        } ${isActive ? "bg-surface text-accent shadow-sm" : "text-text-3 hover:text-text-2"}`}
                    >
                        {option.label}
                        {option.description ? (
                            <span
                                className={`mt-0.5 block text-[11.5px] font-normal leading-snug ${
                                    isActive ? "text-text-2" : "text-text-3"
                                }`}
                            >
                                {option.description}
                            </span>
                        ) : null}
                    </button>
                );
            })}
        </div>
    );
}
