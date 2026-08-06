import { ReactNode } from "react";

type ConfigSectionProps = {
    title: string;
    children: ReactNode;
    /** Tutorial spotlight target id (rendered as data-tutorial-id). */
    tutorialId?: string;
};

/**
 * Cada assunto da configuração é um cartão próprio, como no mockup: só o
 * título e o conteúdo. O ladrilho de ícone e a linha de descrição saíram —
 * quatro cartões com ícone colorido competiam entre si e empurravam o
 * conteúdo para baixo.
 */
export default function ConfigSection({ title, children, tutorialId }: ConfigSectionProps) {
    return (
        <section
            className="w-full rounded-card border border-border bg-surface p-5"
            data-tutorial-id={tutorialId}
        >
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-text">{title}</h2>
            <div className="mt-3.5 flex w-full flex-col">{children}</div>
        </section>
    );
}
