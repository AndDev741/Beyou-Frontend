import { ReactNode } from "react";

type ConfigSectionProps = {
    icon: ReactNode;
    title: string;
    description: string;
    children: ReactNode;
};

export default function ConfigSection({ icon, title, description, children }: ConfigSectionProps) {
    return (
        <section className="w-full py-4">
            <header className="flex items-center gap-2 px-2">
                <span className="text-xl text-primary">{icon}</span>
                <div>
                    <h2 className="text-lg font-bold text-secondary">{title}</h2>
                    <p className="text-xs text-description">{description}</p>
                </div>
            </header>
            <div className="mt-2 flex w-full flex-col items-center">{children}</div>
        </section>
    );
}
