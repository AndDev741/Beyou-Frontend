/**
 * O prazo de uma meta, na forma curta que o cartão usa — e com o ANO na frente
 * quando ele não é o ano corrente.
 *
 * Sem o ano, "até Jul 24" numa meta de 2027 se lê como julho deste ano: a
 * pessoa acha que faltam semanas quando faltam anos. Só aparece quando difere,
 * porque repetir o ano atual em toda meta é ruído.
 *
 * Vive no pacote compartilhado porque web e mobile mostram o mesmo prazo nos
 * mesmos dois lugares (o bloco do dashboard e o cartão da página de metas), e
 * duas cópias divergiriam na primeira mudança.
 */
export type DeadlineShape =
    /** Só o dia da semana: "sáb". Para metas que vencem nesta semana. */
    | 'weekday'
    /** Dia e mês: "24 de jul". */
    | 'dayMonth'
    /** Só o mês: "jul". Para horizontes longos. */
    | 'month';

const FORMATS: Record<DeadlineShape, Intl.DateTimeFormatOptions> = {
    weekday: { weekday: 'short' },
    dayMonth: { day: 'numeric', month: 'short' },
    month: { month: 'short' },
};

export function formatGoalDeadline(
    value: Date | string | undefined | null,
    locale: string,
    shape: DeadlineShape = 'dayMonth',
    /** Injetável para teste; por padrão, agora. */
    now: Date = new Date(),
): string {
    if (!value) return '';
    const end = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(end.getTime())) return '';

    const label = new Intl.DateTimeFormat(locale, FORMATS[shape]).format(end);
    const year = end.getFullYear();
    return year === now.getFullYear() ? label : `${label} - ${year}`;
}
