import type { ReactNode } from "react";

type PageHeaderProps = {
    title: string;
    /** Linha de contexto: contagens, data, resumo. */
    subtitle?: ReactNode;
    /** Ação primária da página (criar). */
    action?: ReactNode;
    className?: string;
};

/** Cabeçalho de página: título, contexto e a ação primária à direita. */
export default function PageHeader({ title, subtitle, action, className = "" }: PageHeaderProps) {
    return (
        <header className={`mb-5 flex flex-wrap items-center justify-between gap-3 ${className}`}>
            <div>
                <h1 className="text-2xl font-semibold tracking-[-0.02em] text-text">{title}</h1>
                {subtitle && <p className="mt-1 text-sm text-text-2">{subtitle}</p>}
            </div>
            {action}
        </header>
    );
}
