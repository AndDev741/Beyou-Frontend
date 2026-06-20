import { View, Text } from 'react-native';
import Svg, { Polygon, Line, Text as SvgText } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import type category from '@beyou/types/category/categoryType';
import WidgetCard from './WidgetCard';
import { useBeyouTheme } from '../../theme/ThemeProvider';

export interface CategoryBalanceWidgetProps {
  categories: category[] | null;
}

const MIN_CATEGORIES = 3;
const SVG_SIZE = 240;
const CENTER = SVG_SIZE / 2;
// Leave room around the polygon for the point labels.
const RADIUS = SVG_SIZE / 2 - 44;

/** Normalize a theme color to 6-digit hex so appending an alpha suffix (e.g. "33")
 *  yields a valid #RRGGBBAA — theme colors may already be 8-digit (#RRGGBBAA). */
function toHex6(color: string): string {
  if (/^#[0-9a-fA-F]{8}$/.test(color)) return color.slice(0, 7);
  return color;
}

/** Vertex on the unit circle for axis `i` of `count`, starting at the top (12 o'clock). */
function axisPoint(i: number, count: number, magnitude: number): { x: number; y: number } {
  const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * RADIUS * magnitude,
    y: CENTER + Math.sin(angle) * RADIUS * magnitude,
  };
}

/**
 * "Life balance" radar — one axis per category, the polygon plots each category's
 * XP scaled to the max XP. Renders the radar only with >= 3 categories (a polygon
 * needs 3 points); otherwise a fallback message. Mirrors the web CategoryBalance
 * widget (which uses chart.js); here it's hand-drawn with react-native-svg.
 */
export default function CategoryBalanceWidget({ categories }: CategoryBalanceWidgetProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();

  const cats = categories ?? [];
  const hasEnough = cats.length >= MIN_CATEGORIES;

  if (!hasEnough) {
    return (
      <WidgetCard title={t('LifeBalance')} bigSize testID="widget-category-balance">
        <Text
          className="text-description text-center text-sm"
          testID="category-balance-fallback"
        >
          {t('LifeBalanceFallback')}
        </Text>
      </WidgetCard>
    );
  }

  const maxXp = Math.max(1, ...cats.map((c) => c.xp));
  const count = cats.length;

  // Outer axis spokes (full magnitude) + the data polygon (xp-scaled magnitude).
  const axisEnds = cats.map((_, i) => axisPoint(i, count, 1));
  const dataPoints = cats.map((c, i) => axisPoint(i, count, c.xp / maxXp));
  const polygonPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const primary6 = toHex6(theme.primary);
  const axisColor = `${toHex6(theme.secondary)}33`;

  return (
    <WidgetCard title={t('LifeBalance')} bigSize testID="widget-category-balance">
      <Svg width={SVG_SIZE} height={SVG_SIZE} testID="category-balance-radar">
        {/* Axis spokes */}
        {axisEnds.map((p, i) => (
          <Line key={`axis-${i}`} x1={CENTER} y1={CENTER} x2={p.x} y2={p.y} stroke={axisColor} strokeWidth={1} />
        ))}
        {/* Data polygon */}
        <Polygon
          points={polygonPoints}
          fill={`${primary6}33`}
          stroke={theme.primary}
          strokeWidth={2}
        />
        {/* Category name labels at the axis ends */}
        {cats.map((c, i) => {
          const p = axisPoint(i, count, 1.12);
          return (
            <SvgText
              key={`label-${i}`}
              x={p.x}
              y={p.y}
              fill={theme.secondary}
              fontSize={10}
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {c.name}
            </SvgText>
          );
        })}
      </Svg>
    </WidgetCard>
  );
}
