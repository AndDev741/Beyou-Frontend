import { useTranslation } from "react-i18next"
import { useSelector } from "react-redux"
import { Target } from "lucide-react"
import type { RootState } from "@beyou/state/rootReducer"
import BaseDiv from "./baseDiv"

export type dailyProgressProps = {
    checked: number
    total: number
}

const SIZE = 108;
const RADIUS = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * O widget "Hoje": anel grande com a porcentagem do dia e, ao lado, o que ela
 * significa em números — itens concluídos e XP ganho hoje.
 *
 * O anel é SVG e não canvas: canvas não resolve CSS var, o que obrigava a ler
 * cor do objeto de tema e ainda assim errava no primeiro paint.
 */
export default function DailyProgress({ checked, total }: dailyProgressProps) {
    const { t } = useTranslation()
    const xpToday = useSelector((s: RootState) => s.perfil.xp)
    const percent = total > 0 ? Math.round((checked / total) * 100) : 0

    return (
        <BaseDiv title={t("Today")} icon={<Target size={14.5} aria-hidden="true" />}>
            <div className="mt-3 flex items-center gap-[18px]">
                <div className="relative h-[108px] w-[108px] shrink-0" data-testid="daily-progress-ring">
                    <svg width={SIZE} height={SIZE} viewBox="0 0 72 72" className="-rotate-90" aria-hidden="true">
                        <circle cx="36" cy="36" r={RADIUS} fill="none" strokeWidth="7" className="stroke-surface-2" />
                        <circle
                            cx="36"
                            cy="36"
                            r={RADIUS}
                            fill="none"
                            strokeWidth="7"
                            strokeLinecap="round"
                            className="stroke-accent transition-[stroke-dashoffset] duration-700 ease-out"
                            strokeDasharray={CIRCUMFERENCE}
                            strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <b className="font-mono text-[22px] font-semibold tracking-[-0.03em] text-text">
                            {percent}%
                        </b>
                        <span className="text-[10.5px] text-text-3">{t("OfTheDay")}</span>
                    </div>
                </div>

                <div className="flex flex-col gap-[7px] text-[12.5px] text-text-2">
                    <div>
                        <b className="font-semibold text-text">
                            {checked} {t("Of")} {total}
                        </b>{" "}
                        {t("Completed")}
                    </div>
                    <div>
                        <b className="font-mono font-semibold text-xp">+{xpToday} XP</b> {t("EarnedToday")}
                    </div>
                </div>
            </div>
        </BaseDiv>
    )
}
