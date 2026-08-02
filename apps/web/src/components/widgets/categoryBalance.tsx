import { useTranslation } from "react-i18next";
import { ChartPie } from "lucide-react";
import BaseDiv from "./baseDiv";
import category from "@beyou/types/category/categoryType";
import { toHex6 } from "./utils/chartColors";

// Re-exported for existing tests; implementation lives in utils/chartColors.
export { toHex6 };

export type categoryBalanceProps = {
    categories: category[] | null;
};

const MIN_CATEGORIES = 3;
const MAX_AXES = 6;
const CENTER = 60;
const RADIUS = 46;

/** Ponto do eixo `index` (de `count`) a uma fração `ratio` do raio. */
function point(index: number, count: number, ratio: number) {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    return {
        x: CENTER + Math.cos(angle) * RADIUS * ratio,
        y: CENTER + Math.sin(angle) * RADIUS * ratio,
    };
}

const polygon = (count: number, ratio: number) =>
    Array.from({ length: count }, (_, i) => point(i, count, ratio))
        .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        .join(" ");

/**
 * Equilíbrio de vida: XP por categoria num radar.
 *
 * SVG em vez de chart.js — o canvas não resolve CSS var, então a cor tinha de
 * ser lida do objeto de tema e ainda ficava errada até o tema aplicar. Aqui a
 * malha e a série são classes de token e acompanham tema e pack de acento.
 */
export default function CategoryBalance({ categories }: categoryBalanceProps) {
    const { t } = useTranslation();
    const axes = (categories ?? []).slice(0, MAX_AXES);
    const hasEnough = axes.length >= MIN_CATEGORIES;

    if (!hasEnough) {
        return (
            <BaseDiv title={t("LifeBalance")} icon={<ChartPie size={14.5} aria-hidden="true" />}>
                <p className="mt-3 text-center text-sm text-text-2" data-testid="category-balance-fallback">
                    {t("LifeBalanceFallback")}
                </p>
            </BaseDiv>
        );
    }

    // A escala é relativa ao maior XP: o radar mostra EQUILÍBRIO entre áreas,
    // não valor absoluto.
    const maxXp = Math.max(...axes.map((c) => c.xp), 1);
    const series = axes
        .map((c, i) => {
            const p = point(i, axes.length, Math.max(0.08, c.xp / maxXp));
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
        })
        .join(" ");

    return (
        <BaseDiv title={t("LifeBalance")} icon={<ChartPie size={14.5} aria-hidden="true" />}>
            <div className="mt-1.5 flex justify-center">
                <svg
                    width="164"
                    height="150"
                    viewBox="0 0 120 120"
                    role="img"
                    aria-label={t("LifeBalance")}
                    data-testid="category-balance-chart"
                >
                    <polygon points={polygon(axes.length, 1)} className="fill-none stroke-border" />
                    <polygon points={polygon(axes.length, 0.5)} className="fill-none stroke-border" />
                    <polygon
                        points={series}
                        className="fill-accent/20 stroke-accent"
                        strokeWidth={1.5}
                    />
                    {axes.map((c, i) => {
                        const label = point(i, axes.length, 1.28);
                        return (
                            <text
                                key={c.id}
                                x={label.x}
                                y={label.y}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className="fill-text-3 font-mono text-[8.5px] font-medium"
                            >
                                {c.name.length > 10 ? `${c.name.slice(0, 9)}…` : c.name}
                            </text>
                        );
                    })}
                </svg>
            </div>
        </BaseDiv>
    );
}
