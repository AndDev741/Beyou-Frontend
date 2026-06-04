import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import BaseDiv from "./baseDiv";
import { Chart, RadialLinearScale, PointElement, LineElement, Filler, Tooltip } from "chart.js";
import category from "../../types/category/categoryType";

Chart.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

/** Themes may define 8-digit hex (#rrggbbaa) — strip the alpha so we can append our own. */
export const toHex6 = (raw: string): string =>
    raw.replace(/^(#[0-9a-fA-F]{6})[0-9a-fA-F]{2}$/, "$1");

export type categoryBalanceProps = {
    categories: category[] | null;
};

const MIN_CATEGORIES = 3;

export default function CategoryBalance({ categories }: categoryBalanceProps) {
    const { t } = useTranslation();
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<Chart | null>(null);

    const hasEnough = (categories?.length ?? 0) >= MIN_CATEGORIES;

    useEffect(() => {
        if (!hasEnough || !chartRef.current || !categories) return;

        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        const styles = getComputedStyle(document.documentElement);
        const primary = toHex6(styles.getPropertyValue("--primary").trim() || "#0082E1");
        const secondary = toHex6(styles.getPropertyValue("--secondary").trim() || "#000000");

        chartInstanceRef.current = new Chart(chartRef.current, {
            type: "radar",
            data: {
                labels: categories.map(c => c.name),
                datasets: [{
                    label: "XP",
                    data: categories.map(c => c.xp),
                    backgroundColor: `${primary}33`,
                    borderColor: primary,
                    pointBackgroundColor: primary,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    r: {
                        ticks: { display: false },
                        grid: { color: `${secondary}22` },
                        pointLabels: { color: secondary }
                    }
                }
            }
        });

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };
    }, [categories, hasEnough]);

    return (
        <BaseDiv title={t("LifeBalance")} bigSize={true}>
            {hasEnough ? (
                <canvas ref={chartRef} className="w-full max-h-[220px]" data-testid="category-balance-chart" />
            ) : (
                <p className="text-center text-sm text-description" data-testid="category-balance-fallback">
                    {t("LifeBalanceFallback")}
                </p>
            )}
        </BaseDiv>
    );
}
