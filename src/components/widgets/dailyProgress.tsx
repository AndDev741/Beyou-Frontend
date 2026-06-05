import { useTranslation } from "react-i18next"
import BaseDiv from "./baseDiv"
import {
    Chart,
    ArcElement,
    Tooltip,
    Legend,
    DoughnutController
} from "chart.js"
import { useEffect, useRef } from "react"
import { ProgressRing } from "../progressRing"
import { resolveThemeColor } from "./utils/chartColors"

Chart.register(ArcElement, Tooltip, Legend, DoughnutController)

export type dailyProgressProps = {
    checked: number
    total: number
}

export default function DailyProgress({ checked, total }: dailyProgressProps) {
    const { t } = useTranslation()
    const chartRef = useRef<HTMLCanvasElement>(null)
    const chartInstanceRef = useRef<Chart | null>(null)

    useEffect(() => {
        if (!chartRef.current) return

        // Destroi gráfico antigo se existir
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy()
        }

        // Canvas can't resolve CSS variables — read the theme colors here.
        const primary = resolveThemeColor("--primary", "#0082E1")
        const secondary = resolveThemeColor("--secondary", "#000000")

        chartInstanceRef.current = new Chart(chartRef.current, {
            type: 'doughnut',
            data: {
                labels: ['Checked', 'Remaining'],
                datasets: [{
                    label: 'Daily Progress',
                    data: [checked, total - checked],
                    backgroundColor: [primary, 'transparent'],
                    borderColor: [primary, primary],
                    borderWidth: 1,
                }],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: secondary,
                        },
                    },
                },
            },
        })

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy()
            }
        }
    }, [checked, total])

    return (
        <BaseDiv title={t('Daily Progress')} bigSize={true}>
            {/* Mobile: full-width row — phrase on the left, ring on the right */}
            <div className="md:hidden flex w-full items-center justify-between gap-3 px-2 py-2">
                <div className="flex flex-col text-left">
                    <p className="text-primary text-sm font-semibold">
                        {t('Daily progress phrase')}
                    </p>
                    <p className="text-secondary text-lg font-semibold mt-1">
                        {t('Tasks')}: {checked}/{total}
                    </p>
                </div>
                <div className="shrink-0" data-testid="daily-progress-ring">
                    <ProgressRing progress={total > 0 ? (checked / total) * 100 : 0} size="lg" />
                </div>
            </div>

            {/* Desktop: phrase + doughnut, unchanged */}
            <p className="hidden md:block text-primary text-lg font-semibold whitespace-pre-line lg:whitespace-nowrap text-center">
                {t('Daily progress phrase')}
            </p>
            <p className="hidden md:block text-primary text-lg font-semibold">{t('Tasks')}</p>
            <div className="hidden md:block">
                <canvas ref={chartRef} className="w-full h-[200px]"></canvas>
            </div>
            <p className="hidden md:block text-secondary text-lg font-semibold">{checked}/{total}</p>
        </BaseDiv>
    )
}
