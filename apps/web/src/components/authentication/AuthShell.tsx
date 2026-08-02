import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BrandMark from "../brand/BrandMark";

type AuthShellProps = {
    title: string;
    subtitle?: string;
    children: ReactNode;
    /** Login e registro mostram as abas; recuperar/verificar não. */
    showTabs?: boolean;
};

/**
 * A casca das telas de autenticação: painel de marca à esquerda e o cartão do
 * formulário à direita. Registro, recuperação e verificação herdam daqui — só
 * o conteúdo do cartão muda.
 *
 * Sem seletor de tema e sem seletor de idioma: antes de existir conta o app
 * segue o padrão do sistema (tema pela preferência do SO, idioma pelo
 * navegador). Trocar isso é coisa de usuário logado, na Configuração.
 */
export default function AuthShell({ title, subtitle, children, showTabs = false }: AuthShellProps) {
    const { t } = useTranslation();
    const path = useLocation().pathname;

    return (
        <div className="min-h-screen bg-bg text-text lg:grid lg:grid-cols-[1fr_1.1fr]">
            {/* O símbolo em escala grande sangra pelo canto superior direito a 7%
                de opacidade: é textura, não ilustração. O conteúdo ancora no
                rodapé do painel. */}
            <aside className="relative hidden overflow-hidden border-r border-border bg-surface p-9 lg:flex lg:flex-col lg:justify-end">
                <BrandMark
                    size={420}
                    className="pointer-events-none absolute -right-20 -top-16 text-accent opacity-[0.07]"
                />
                <div className="relative">
                    <BrandMark size={26} withWordmark className="text-accent" />
                    <h2 className="mt-[18px] max-w-[300px] text-[26px] font-semibold leading-[1.2] tracking-[-0.02em] text-text">
                        {t("LoginBrandHeadline")}
                    </h2>
                    <p className="mt-2.5 max-w-[300px] text-sm text-text-2">{t("LoginBrandSub")}</p>
                </div>
            </aside>

            <main className="flex flex-col items-center justify-center px-4 py-10">
                <div className="w-full max-w-[380px]">
                    <div className="mb-6 flex justify-center lg:hidden">
                        <BrandMark size={32} withWordmark className="text-accent" />
                    </div>

                    <div className="rounded-card border border-border bg-surface p-6 shadow-surface">
                        {showTabs && (
                            <nav className="mb-5 flex rounded-control bg-surface-2 p-1" aria-label={t("Login")}>
                                {[
                                    { to: "/", label: t("Login") },
                                    { to: "/register", label: t("Register") },
                                ].map((tab) => (
                                    <Link
                                        key={tab.to}
                                        to={tab.to}
                                        aria-current={path === tab.to ? "page" : undefined}
                                        className={`flex-1 rounded-[7px] py-1.5 text-center text-sm font-semibold transition-colors duration-200 ${
                                            path === tab.to
                                                ? "bg-surface text-text shadow-sm"
                                                : "text-text-2 hover:text-text"
                                        }`}
                                    >
                                        {tab.label}
                                    </Link>
                                ))}
                            </nav>
                        )}

                        <h1 className="text-xl font-semibold tracking-[-0.015em] text-text">{title}</h1>
                        {subtitle && <p className="mt-1.5 text-[13px] text-text-3">{subtitle}</p>}

                        <div className="mt-5">{children}</div>
                    </div>
                </div>
            </main>
        </div>
    );
}
