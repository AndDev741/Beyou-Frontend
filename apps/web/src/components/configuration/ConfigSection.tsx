import { ReactNode } from "react";

type ConfigSectionProps = {
    icon: ReactNode;
    title: string;
    description: string;
    children: ReactNode;
    /** Tutorial spotlight target id (rendered as data-tutorial-id). */
    tutorialId?: string;
};

/** Cada assunto da configuração é um cartão próprio, como no mockup. */
export default function ConfigSection({ icon, title, description, children, tutorialId }: ConfigSectionProps) {
    return (
        <section
            className="w-full rounded-card border border-border bg-surface p-5"
            data-tutorial-id={tutorialId}
        >
            <header className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-accent-soft text-lg text-accent">
                    {icon}
                </span>
                <div className="min-w-0">
                    <h2 className="text-base font-semibold text-text">{title}</h2>
                    <p className="mt-0.5 text-xs text-text-2">{description}</p>
                </div>
            </header>
            <div className="mt-4 flex w-full flex-col">{children}</div>
        </section>
    );
}
