import { View, Text } from 'react-native';
import Svg, { Polygon, Text as SvgText } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { ChartPie } from 'lucide-react-native';
import { withAlpha } from '@beyou/theme';
import type category from '@beyou/types/category/categoryType';
import WidgetCard from './WidgetCard';
import { useBeyouTheme } from '../../theme/ThemeProvider';

export interface CategoryBalanceWidgetProps {
  categories: category[] | null;
}

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
    .join(' ');

/**
 * Life balance: XP per category on a radar — the same drawing as the web, with the
 * two-ring mesh, the series in translucent accent and the labels outside.
 *
 * The scale is relative to the highest XP: the radar shows BALANCE between areas,
 * not absolute value.
 */
export default function CategoryBalanceWidget({ categories }: CategoryBalanceWidgetProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();

  const axes = (categories ?? []).slice(0, MAX_AXES);
  const icon = <ChartPie size={14.5} color={theme.text3} />;

  if (axes.length < MIN_CATEGORIES) {
    return (
      <WidgetCard title={t('LifeBalance')} icon={icon} testID="widget-category-balance">
        <Text
          className="mt-3 text-center text-[12.5px] text-text-2"
          testID="category-balance-fallback"
        >
          {t('LifeBalanceFallback')}
        </Text>
      </WidgetCard>
    );
  }

  const maxXp = Math.max(...axes.map((c) => c.xp), 1);
  const series = axes
    .map((c, i) => {
      const p = point(i, axes.length, Math.max(0.08, c.xp / maxXp));
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <WidgetCard title={t('LifeBalance')} icon={icon} testID="widget-category-balance">
      <View className="mt-1.5 items-center">
        {/* The viewBox has negative slack at the sides and top: the polygon takes
            0..120, but the labels grow outside it and were being clipped. */}
        <Svg
          width={196}
          height={150}
          viewBox="-34 -14 188 148"
          accessibilityRole="image"
          accessibilityLabel={t('LifeBalance')}
          testID="category-balance-radar"
        >
          <Polygon points={polygon(axes.length, 1)} fill="none" stroke={theme.border} />
          <Polygon points={polygon(axes.length, 0.5)} fill="none" stroke={theme.border} />
          <Polygon
            points={series}
            fill={withAlpha(theme.accent, 0.2)}
            stroke={theme.accent}
            strokeWidth={1.5}
          />
          {axes.map((c, i) => {
            const label = point(i, axes.length, LABEL_RATIO);
            // The text grows OUTWARD from the polygon: on the right it starts at
            // the point, on the left it ends there. With a fixed "middle", the side
            // labels ran over the chart.
            const dx = label.x - CENTER;
            const anchor = Math.abs(dx) < 6 ? 'middle' : dx > 0 ? 'start' : 'end';
            return (
              <SvgText
                key={c.id}
                x={label.x}
                y={label.y}
                textAnchor={anchor}
                alignmentBaseline="middle"
                fill={theme.text3}
                fontFamily="GeistMono"
                fontSize={8.5}
              >
                {c.name.length > 12 ? `${c.name.slice(0, 11)}…` : c.name}
              </SvgText>
            );
          })}
        </Svg>
      </View>
    </WidgetCard>
  );
}
