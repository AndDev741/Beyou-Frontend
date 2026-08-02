import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import BrandMark from "../brand/BrandMark";

type AuthShellProps = {
    title: string;
    subtitle?: string;
    children: ReactNode;
    /** Linha final do cartão ("Novo por aqui? Criar conta"). */
    footer?: ReactNode;
};

/**
 * A casca das telas de autenticação: painel de marca à esquerda e o formulário
 * à direita. Registro, recuperação e verificação herdam daqui — só o conteúdo
 * muda.
 *
 * O formulário NÃO fica dentro de um cartão com borda: o painel é a superfície
 * e o lado do formulário é o tom de página, separados pela divisa. Uma moldura
 * ali dentro seria caixa dentro de caixa.
 *
 * Sem seletor de tema e sem seletor de idioma: antes de existir conta o app
 * segue o padrão do sistema (tema pelo SO, idioma pelo navegador). Trocar é
 * coisa de usuário logado, na Configuração.
 */
export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen bg-bg text-text lg:grid lg:grid-cols-[1fr_1.1fr]">
            {/* O símbolo ocupa quase toda a largura do painel e sangra pelo canto
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
                    <div className="mb-8 flex justify-center lg:hidden">
                        <BrandMark size={30} withWordmark className="text-accent" />
                    </div>

                    <h1 className="text-xl font-semibold tracking-[-0.015em] text-text">{title}</h1>
                    {subtitle && <p className="mt-1.5 text-[13px] text-text-3">{subtitle}</p>}

                    {children}

                    {footer && <div className="mt-4 text-center text-[12.5px] text-text-3">{footer}</div>}
                </div>
            </main>
        </div>
    );
}
