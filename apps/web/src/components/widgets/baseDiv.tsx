import { ReactNode } from "react"

type baseDivProps = {
    title: string,
    children: ReactNode,
    /** Ícone do cabeçalho (14.5px, em text-3). */
    icon?: ReactNode,
    /** Ação à direita do título (menu, atalho). */
    action?: ReactNode,
    bigSize?: boolean
}

/**
 * A moldura de todo widget do rail: superfície, cabeçalho discreto com ícone e
 * o conteúdo abaixo. `bigSize` sobrou do layout antigo e hoje só afeta o
 * mobile, onde o carrossel dá largura cheia a todos.
 */
export default function BaseDiv({ title, children, icon, action }: baseDivProps) {
    return (
        <div className="rounded-card border border-border bg-surface px-[18px] py-4">
            <div className="flex items-center gap-2 text-[12.5px] font-semibold text-text-2">
                {icon && <span className="text-text-3">{icon}</span>}
                {title}
                {action && <span className="ml-auto text-text-3">{action}</span>}
            </div>
            {children}
        </div>
    )
}
