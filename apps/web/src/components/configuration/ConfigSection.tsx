import { ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";

type ConfigSectionProps = {
    title: string;
    children: ReactNode;
    /** The card's icon — phone only, where the list is a menu. */
    icon?: ReactNode;
    /** Replaces the title on phones (profile shows avatar, name and level). */
    mobileHeader?: ReactNode;
    /** Tutorial spotlight target id (rendered as data-tutorial-id). */
    tutorialId?: string;
    /** Starts open on phones. */
    defaultOpen?: boolean;
    className?: string;
};

/**
 * Every configuration topic is a card of its own.
 *
 * On phones the cards become a menu: icon, name and chevron; a tap opens the
 * content. The whole page open took about six scrolls to reach the widgets. On
 * desktop there is no fold — both columns fit, and hiding content there would only
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
