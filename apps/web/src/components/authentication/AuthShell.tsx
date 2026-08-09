import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import BrandMark from "../brand/BrandMark";

type AuthShellProps = {
    title: string;
    subtitle?: string;
    children: ReactNode;
    /** Last line of the card ("New here? Create account"). */
    footer?: ReactNode;
};

/**
 * The shell of the auth screens: brand panel on the left, form on the right.
 * Register, recovery and verification inherit from here — only the content
 * changes.
 *
 * The form is NOT inside a bordered card: the panel is the surface and the form
 * side is the page tone, split by the divider. A frame in there would be a box
 * inside a box.
 *
 * No theme selector and no language selector: before an account exists the app
 * follows the system default (theme from the OS, language from the browser).
 * Switching is something a signed-in user does, in Configuration.
 */
export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen bg-bg text-text lg:grid lg:grid-cols-[1fr_1.1fr]">
            {/* The symbol takes almost the panel's full width and bleeds off the
                superior direito a 7%: é textura, não ilustração. O conteúdo
                ancora no rodapé esquerdo. */}
            <aside className="relative hidden overflow-hidden border-r border-border bg-surface p-9 lg:flex lg:flex-col lg:justify-end">
                <BrandMark
                    fluid
                    className="pointer-events-none absolute -right-[19%] -top-[14%] block w-[82%] text-accent opacity-[0.07]"
                />
                <div className="relative">
                    <BrandMark size={32} withWordmark className="text-accent" />
                    <h2 className="mt-[18px] max-w-[300px] text-[32px] font-semibold leading-[1.2] tracking-[-0.02em] text-text">
                        {t("LoginBrandHeadline")}
                    </h2>
                    <p className="mt-2.5 max-w-[300px] text-[13.5px] text-text-2">
                        {t("LoginBrandSub")}
                    </p>
                </div>
            </aside>

            <main className="flex flex-col items-center justify-center px-5 py-10">
                <div className="w-full max-w-[360px]">
                    {/* On phones the brand is the header: symbol on top,
                        wordmark embaixo em cor de texto. O painel de marca não
                        existe nessa largura. */}
                    <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
                        <BrandMark size={44} className="text-accent" />
                        <span className="text-xl font-semibold tracking-[-0.02em] text-text">beyou</span>
                    </div>

                    {/* The greeting belongs to desktop: on phones the brand
                        topo e repetir "Bem-vindo de volta" ali empurrava o
                        formulário para baixo da dobra. Fica no DOM (a página
                        precisa de um h1) apenas invisível. */}
                    <h1 className="sr-only text-xl font-semibold tracking-[-0.015em] text-text lg:not-sr-only">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="hidden text-[13px] text-text-3 lg:mt-1.5 lg:block">{subtitle}</p>
                    )}

                    {children}

                    {footer && <div className="mt-4 text-center text-[12.5px] text-text-3">{footer}</div>}
                </div>
            </main>
        </div>
    );
}
