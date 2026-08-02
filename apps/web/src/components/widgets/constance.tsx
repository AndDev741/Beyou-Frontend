import { useTranslation } from "react-i18next"
import { useSelector } from "react-redux"
import { Flame } from "lucide-react"
import type { RootState } from "@beyou/state/rootReducer"
import BaseDiv from "./baseDiv"

export type constanceProps = {
    constance: number;
}

const DAYS_SHOWN = 28;

/**
 * Constância: o número grande, o recorde ao lado e a faixa dos últimos 28 dias.
 *
 * A API não devolve histórico diário — o que sabemos com certeza é o tamanho da
 * sequência ATUAL. A faixa então destaca só esses dias e deixa o resto neutro;
 * o rótulo diz isso em voz alta para ninguém ler quadrado apagado como "falhei".
 * Quando existir endpoint de histórico, é aqui que ele entra.
 */
export default function Constance({ constance }: constanceProps) {
    const { t } = useTranslation();
    const best = useSelector((s: RootState) => s.perfil.maxConstance);
    const streakDays = Math.min(constance, DAYS_SHOWN);

    return (
        <BaseDiv title={t("Constance")} icon={<Flame size={14.5} aria-hidden="true" />}>
            <div className="mt-2.5 flex items-baseline gap-2">
                <b className="font-mono text-2xl font-semibold tracking-[-0.03em] text-text">{constance}</b>
                <span className="text-xs text-text-3">
                    {t("DaysInARow")}
                    {best > 0 && ` · ${t("Best")}: ${best}`}
                </span>
            </div>

            <div
                className="mt-3 grid grid-cols-14 gap-[3px]"
                role="img"
                aria-label={t("StreakStripLabel", { days: streakDays, total: DAYS_SHOWN })}
            >
                {Array.from({ length: DAYS_SHOWN }, (_, index) => {
                    // A sequência atual termina hoje, então ela ocupa o FIM da faixa.
                    const inStreak = index >= DAYS_SHOWN - streakDays;
                    return (
                        <i
                            key={index}
                            className={`aspect-square rounded-[3px] ${inStreak ? "bg-accent" : "bg-surface-2"}`}
                        />
                    );
                })}
            </div>
            <p className="mt-2 text-[10.5px] text-text-3">{t("StreakStripCaption")}</p>
        </BaseDiv>
    )
}
