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

Chart.register(ArcElement, Tooltip, Legend, DoughnutController)

type dailyProgressProps = {
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

        chartInstanceRef.current = new Chart(chartRef.current, {
            type: 'doughnut',
            data: {
                labels: ['Checked', 'Remaining'],
                datasets: [{
                    label: 'Daily Progress',
                    data: [checked, total - checked],
                    backgroundColor: ['#0082E1', '#0000'],
                    borderColor: ['#0082E1', '#0082E1'],
                    borderWidth: 1,
                }],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
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
            <p className="hidden md:block text-blueMain text-lg font-semibold whitespace-pre-line">
                {t('Daily progress phrase')}
            </p>
            <p className="text-blueMain text-lg font-semibold">{t('Tasks')}</p>
            <div className="hidden md:block">
                <canvas ref={chartRef} className="w-full h-[200px]"></canvas>
            </div>
            <p className="text-blueMain text-lg font-semibold">{checked}/{total}</p>
        </BaseDiv>
    )
}
