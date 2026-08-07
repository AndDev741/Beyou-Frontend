import { ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";

type ConfigSectionProps = {
    title: string;
    children: ReactNode;
    /** Ícone do cartão — só aparece no telefone, onde a lista é um menu. */
    icon?: ReactNode;
    /** Substitui o título no telefone (o perfil mostra avatar, nome e nível). */
    mobileHeader?: ReactNode;
    /** Tutorial spotlight target id (rendered as data-tutorial-id). */
    tutorialId?: string;
    /** Começa aberta no telefone. */
    defaultOpen?: boolean;
    className?: string;
};

/**
 * Cada assunto da configuração é um cartão próprio.
 *
 * No telefone os cartões viram um menu: ícone, nome e chevron; tocar abre o
 * conteúdo. A página inteira aberta dava umas seis rolagens até os widgets.
 * No desktop não há dobra — as duas colunas cabem, e esconder conteúdo ali só
 * criaria cliques.
 */
export default function ConfigSection({
    title,
    children,
    icon,
    mobileHeader,
    tutorialId,
    defaultOpen = false,
    className = "",
}: ConfigSectionProps) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <section
            className={`w-full rounded-card border border-border bg-surface p-4 lg:p-5 ${className}`}
            data-tutorial-id={tutorialId}
        >
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 text-left lg:pointer-events-none"
            >
                {icon && (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent lg:hidden">
                        {icon}
                    </span>
                )}

                <span className="min-w-0 flex-1">
                    {mobileHeader ? (
                        <>
                            <span className="lg:hidden">{mobileHeader}</span>
                            <h2 className="hidden text-[15px] font-semibold tracking-[-0.01em] text-text lg:block">
                                {title}
                            </h2>
                        </>
                    ) : (
                        <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-text lg:text-[15px]">
                            {title}
                        </h2>
                    )}
                </span>

                <ChevronDown
                    size={18}
                    aria-hidden="true"
                    className={`shrink-0 text-text-3 transition-transform duration-200 lg:hidden ${
                        open ? "rotate-180" : "-rotate-90"
                    }`}
                />
            </button>

            <div className={`${open ? "flex" : "hidden"} mt-3.5 w-full flex-col lg:flex`}>{children}</div>
        </section>
    );
}
