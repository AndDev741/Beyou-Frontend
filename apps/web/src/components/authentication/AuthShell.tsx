import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BrandMark from "../brand/BrandMark";
import ThemeSelectorInline from "./ThemeSelectorInline";
import TranslationButton from "../translationButton";

type AuthShellProps = {
    title: string;
    subtitle?: string;
    children: ReactNode;
    /** Login e registro mostram as abas; recuperar/verificar não. */
    showTabs?: boolean;
};

/**
 * A casca das telas de autenticação: painel de marca à esquerda (o próprio
 * símbolo vira textura, sem clipart) e o cartão do formulário à direita.
 * Registro, recuperação e verificação herdam daqui — só o conteúdo do cartão
 * muda.
 */
export default function AuthShell({ title, subtitle, children, showTabs = false }: AuthShellProps) {
    const { t } = useTranslation();
    const path = useLocation().pathname;

    return (
        <div className="flex min-h-screen bg-bg text-text">
            <aside className="relative hidden w-[46%] shrink-0 overflow-hidden bg-accent px-12 py-14 text-on-accent lg:flex lg:flex-col lg:justify-center">
                {/* O símbolo em escala grande é a textura do painel; fica atrás
                    do conteúdo e não compete com ele. */}
                <BrandMark
                    size={520}
                    className="pointer-events-none absolute -bottom-24 -right-32 text-on-accent/10"
                />
                <div className="relative">
                    <BrandMark size={26} withWordmark className="text-on-accent" />
                    <h2 className="mt-8 max-w-md text-4xl font-semibold leading-tight tracking-[-0.02em]">
                        {t("LoginBrandHeadline")}
                    </h2>
                    <p className="mt-3 max-w-sm text-base text-on-accent/75">{t("LoginBrandSub")}</p>
                    <div className="mt-10">
                        <ThemeSelectorInline />
                    </div>
                </div>
            </aside>

            <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
                <div className="w-full max-w-[400px]">
                    <div className="mb-6 flex items-center justify-between lg:hidden">
                        <BrandMark size={30} withWordmark className="text-accent" />
                        <TranslationButton />
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

                        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-text">{title}</h1>
                        {subtitle && <p className="mt-1 text-sm text-text-2">{subtitle}</p>}

                        <div className="mt-5">{children}</div>
                    </div>

                    <div className="mt-6 hidden justify-center lg:flex">
                        <TranslationButton />
                    </div>
                </div>
            </main>
        </div>
    );
}
