type Option<T extends string | number> = { value: T; label: string };

type SegmentedControlProps<T extends string | number> = {
    options: Option<T>[];
    value: T;
    onChange: (value: T) => void;
    label: string;
    size?: "sm" | "md";
    className?: string;
};

/**
 * Escolha única e curta (importância, dificuldade, experiência, modo). Troca os
 * selects e as fileiras de botões soltos que cada formulário reinventava.
 */
export default function SegmentedControl<T extends string | number>({
    options,
    value,
    onChange,
    label,
    size = "md",
    className = "",
}: SegmentedControlProps<T>) {
    const pad = size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm";
    return (
        <div
            role="radiogroup"
            aria-label={label}
            className={`inline-flex rounded-control bg-surface-2 p-1 ${className}`}
        >
            {options.map((option) => {
                const isActive = option.value === value;
                return (
                    <button
                        key={String(option.value)}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        onClick={() => onChange(option.value)}
                        className={`flex-1 rounded-[7px] font-semibold transition-colors duration-200 ${pad} ${
                            isActive ? "bg-surface text-text shadow-sm" : "text-text-2 hover:text-text"
                        }`}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
