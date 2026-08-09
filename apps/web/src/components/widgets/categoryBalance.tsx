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
const RADIUS = 42;
/** Where the label sits, in multiples of the radius. */
const LABEL_RATIO = 1.3;

/** Point on axis `index` (of `count`) at a `ratio` fraction of the radius. */
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
 * Life balance: XP per category on a radar.
 *
 * SVG instead of chart.js — a canvas cannot resolve a CSS var, so the colour had
 * to be read from the theme object and was still wrong until the theme applied.
 * Here the mesh and the series are token classes and follow theme and accent
 * pack.
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

    // The scale is relative to the highest XP: the radar shows BALANCE between
    // areas, not absolute value.
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
                {/* The viewBox has negative slack at the sides and top: the
                    polígono ocupa 0..120, mas os rótulos crescem para fora dele
                    e eram cortados pela borda. */}
                <svg
                    width="196"
                    height="150"
                    viewBox="-34 -14 188 148"
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
                        const label = point(i, axes.length, LABEL_RATIO);
                        // The text grows OUTWARD from the polygon: on the right it
                        // starts at the point, on the left it ends there. With a
                        // fixed "middle", the side labels ran over the chart.
                        const dx = label.x - CENTER;
                        const anchor = Math.abs(dx) < 6 ? "middle" : dx > 0 ? "start" : "end";
                        return (
                            <text
                                key={c.id}
                                x={label.x}
                                y={label.y}
                                textAnchor={anchor}
                                dominantBaseline="middle"
                                className="fill-text-3 font-mono text-[8.5px] font-medium"
                            >
                                {c.name.length > 12 ? `${c.name.slice(0, 11)}…` : c.name}
                            </text>
                        );
                    })}
                </svg>
            </div>
        </BaseDiv>
    );
}
