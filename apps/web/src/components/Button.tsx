type ButtonMode = "primary" | "tonal" | "ghost" | "danger" | "cancel" | "create" | "default";

type buttonProps = {
    text: string;
    size: "big" | "medium" | "small" | "auto";
    mode: ButtonMode;
    onClick?: () => void;
    type?: "submit" | "reset" | "button" | undefined;
    icon?: React.ReactNode;
    testId?: string;
    disabled?: boolean;
    className?: string;
    /** Tutorial anchor (data-tutorial-id). */
    tutorialId?: string;
    /**
     * On phones the button becomes an icon-only disc; the label stays in the DOM
     * (`sr-only`), so screen readers and name-based tests still find it.
     */
    collapseLabel?: boolean;
}

/**
 * The system's four modes: primary (the page's action), tonal (a secondary with
 * weight), ghost (quiet) and destructive.
 *
 * `cancel`, `create` and `default` are the old names, kept because 42 files
 * import this button; each points at its new equivalent and disappears as the
 * pages migrate.
 */
const MODES: Record<ButtonMode, string> = {
    primary: "bg-accent text-on-accent hover:bg-accent-strong active:scale-[.98] shadow-sm",
    tonal: "bg-accent-soft text-accent hover:bg-accent/15 active:scale-[.98]",
    ghost: "bg-transparent text-text-2 hover:bg-surface-2 hover:text-text active:scale-[.98]",
    danger: "bg-danger/10 text-danger hover:bg-danger/15 active:scale-[.98]",
    // old-model aliases
    cancel: "bg-surface-2 text-text-2 hover:text-text active:scale-[.98]",
    create: "bg-accent text-on-accent hover:bg-accent-strong active:scale-[.98] shadow-sm",
    default: "bg-surface text-text border border-border hover:bg-surface-2 active:scale-[.98]",
};

const SIZES: Record<buttonProps["size"], string> = {
    // The fixed width is gone: the button grows with its text — the pt strings
    // are longer than the en ones and clipped labels in the old layout.
    big: "h-11 px-6 text-base",
    medium: "h-10 px-5 text-sm",
    small: "h-9 px-4 text-sm",
    auto: "h-10 px-5 text-sm",
};

/** Icon-only disc below `md`, labelled button from there up. */
const COLLAPSED = "h-10 w-10 shrink-0 rounded-full px-0 text-sm md:w-auto md:rounded-control md:px-5";

function Button({ text, size, mode, onClick, type, icon, testId, disabled, className = "", tutorialId, collapseLabel = false }: buttonProps) {
    return (
        <button
            className={`inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 ${MODES[mode]} ${collapseLabel ? COLLAPSED : SIZES[size]} ${className}`}
            onClick={onClick}
            type={type}
            data-testid={testId}
            data-tutorial-id={tutorialId}
            disabled={disabled}
        >
            {icon && <span aria-hidden="true">{icon}</span>}
            {collapseLabel ? <span className="sr-only md:not-sr-only">{text}</span> : text}
        </button>
    )
}

export default Button;
