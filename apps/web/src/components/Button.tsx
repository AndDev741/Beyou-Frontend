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
}

/**
 * Os quatro modos do sistema: primário (a ação da tela), tonal (secundária de
 * peso), ghost (discreta) e destrutivo.
 *
 * `cancel`, `create` e `default` são os nomes antigos, mantidos porque 42
 * arquivos importam este botão; cada um aponta para o modo novo equivalente e
 * some conforme as páginas migram.
 */
const MODES: Record<ButtonMode, string> = {
    primary: "bg-accent text-on-accent hover:bg-accent-strong active:scale-[.98] shadow-sm",
    tonal: "bg-accent-soft text-accent hover:bg-accent/15 active:scale-[.98]",
    ghost: "bg-transparent text-text-2 hover:bg-surface-2 hover:text-text active:scale-[.98]",
    danger: "bg-danger/10 text-danger hover:bg-danger/15 active:scale-[.98]",
    // aliases do modelo antigo
    cancel: "bg-surface-2 text-text-2 hover:text-text active:scale-[.98]",
    create: "bg-accent text-on-accent hover:bg-accent-strong active:scale-[.98] shadow-sm",
    default: "bg-surface text-text border border-border hover:bg-surface-2 active:scale-[.98]",
};

const SIZES: Record<buttonProps["size"], string> = {
    // Largura fixa saiu: o botão cresce com o texto — as traduções em pt são
    // mais longas que as em en e cortavam rótulo no layout antigo.
    big: "h-11 px-6 text-base",
    medium: "h-10 px-5 text-sm",
    small: "h-9 px-4 text-sm",
    auto: "h-10 px-5 text-sm",
};

function Button({ text, size, mode, onClick, type, icon, testId, disabled, className = "" }: buttonProps) {
    return (
        <button
            className={`inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 ${MODES[mode]} ${SIZES[size]} ${className}`}
            onClick={onClick}
            type={type}
            data-testid={testId}
            disabled={disabled}
        >
            {icon && <span aria-hidden="true">{icon}</span>}
            {text}
        </button>
    )
}

export default Button;
