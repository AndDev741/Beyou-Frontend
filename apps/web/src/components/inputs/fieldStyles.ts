/**
 * A gramática de campo do sistema, em um lugar só: rótulo em cima, foco com
 * borda de acento + halo suave, erro com borda de perigo e mensagem embaixo.
 *
 * Antes cada input carregava sua própria cópia de `borderCss/labelCss/errorCss`
 * — e elas já tinham divergido (rótulo `text-2xl` em um, `text-xl` em outro,
 * altura 50px brigando com 40px no mesmo elemento).
 *
 * Nota: modificador de opacidade (`ring-accent/25`) NÃO gera CSS aqui — os
 * tokens são `var(--x)` sem `<alpha-value>`, então o halo usa o token
 * `accent-soft`, que já é a versão translúcida do acento.
 */

/** Largura herdada do layout atual dos formulários. Mudar aqui reflui todos. */
export const FIELD_WIDTH = "w-[45vw] md:w-[320px] lg:w-[15rem]";

export const FIELD_LABEL = "mb-1 text-sm font-semibold text-text";

export const FIELD_ERROR = "mt-1 break-words whitespace-normal text-sm leading-snug text-danger";

const FIELD_BASE =
    "rounded-control border bg-surface text-base text-text placeholder:text-text-3 outline-none transition-colors duration-200 focus:ring-4 focus:ring-accent-soft";

/** Borda: acento no foco, perigo quando há erro. */
export function fieldControl(hasError: boolean): string {
    return `${FIELD_BASE} ${hasError ? "border-danger" : "border-border focus:border-accent"}`;
}
