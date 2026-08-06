import { ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";

type ConfigSectionProps = {
    title: string;
    children: ReactNode;
    /** Tutorial spotlight target id (rendered as data-tutorial-id). */
    tutorialId?: string;
    /** Começa aberta no telefone (o perfil, por ser a primeira). */
    defaultOpen?: boolean;
};

/**
 * Cada assunto da configuração é um cartão próprio, como no mockup.
 *
 * No telefone as caixas ficam fechadas e abrem ao toque: a página inteira
 * aberta dava umas seis rolagens até chegar nos widgets. No desktop não há
 * dobra — as duas colunas cabem, e esconder conteúdo ali só criaria cliques.
 */
export default function ConfigSection({ title, children, tutorialId, defaultOpen = false }: ConfigSectionProps) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <section
            className="w-full rounded-card border border-border bg-surface p-5"
            data-tutorial-id={tutorialId}
        >
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                aria-expanded={open}
                className="flex w-full items-center gap-2 text-left lg:pointer-events-none"
            >
                <h2 className="min-w-0 flex-1 text-[15px] font-semibold tracking-[-0.01em] text-text">{title}</h2>
                <ChevronDown
                    aria-hidden="true"
                    className={`shrink-0 text-text-3 transition-transform duration-200 lg:hidden ${
                        open ? "rotate-180" : ""
                    }`}
                />
            </button>

            <div className={`${open ? "flex" : "hidden"} mt-3.5 w-full flex-col lg:flex`}>{children}</div>
        </section>
    );
}
