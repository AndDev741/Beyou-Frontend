import type { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Gauge } from 'lucide-react-native';
import { withAlpha } from '@beyou/theme';
import type category from '@beyou/types/category/categoryType';
import { calculateLevelProgress } from '@beyou/state/dashboard/helpers';
import WidgetCard from './WidgetCard';
import BeyouIcon from '../BeyouIcon';
import XpSparkline from '../XpSparkline';
import { useBeyouTheme } from '../../theme/ThemeProvider';

export interface AreaWidgetProps {
  category: category | null;
  /** The category's XP per day, oldest first. Without it the card shows the level bar. */
  xpSeries?: number[];
  /** ISO days matching `xpSeries`. */
  xpDays?: string[];
}

interface InnerProps extends AreaWidgetProps {
  title: string;
  icon: ReactNode;
  /** The best area uses the success green; the worst, the flame. */
  variant: 'better' | 'worst';
  testID: string;
}

// Mock shown when the user has no categories yet — mirrors the web widgets.
const categoryExample: category = {
  id: 'example',
  iconId: 'lucide:dumbbell',
  name: 'Example',
  description: 'Just a mock',
  xp: 450,
  actualLevelXp: 400,
  nextLevelXp: 480,
  level: 6,
  createdAt: new Date(),
};

/**
 * The shared body of the best/worst area widgets: the icon in a tile, the name, the
 * level and XP line in mono, and the week of XP as bars.
 *
 * The bars arrive with `GET /xp/history`. Without a window yet (request still out, or
 * an account with no history) the card falls back to the level bar, which is what it
 * showed for months while the series did not exist. Same as the web.
 */
function AreaWidget({ category, xpSeries, xpDays, title, icon, variant, testID }: InnerProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const cat = category ?? categoryExample;
  const progress = calculateLevelProgress(cat.xp, cat.actualLevelXp, cat.nextLevelXp);
  const isWorst = variant === 'worst';

  return (
    <WidgetCard title={title} icon={icon} testID={testID}>
      <View className="mt-3 flex-row items-center gap-2.5">
        <View
          className="h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px]"
          style={{ backgroundColor: withAlpha(isWorst ? theme.flame : theme.success, 0.1) }}
        >
          <BeyouIcon id={cat.iconId} size={16} showFallback />
        </View>
        <View className="min-w-0 flex-1">
          <Text
            className="text-sm font-semibold text-text"
            numberOfLines={1}
            testID={`${testID}-name`}
          >
            {cat.name}
          </Text>
          <Text className="font-mono text-[10.5px] text-text-3">
            {`LV ${cat.level} · ${cat.xp}/${cat.nextLevelXp} XP`}
          </Text>
        </View>
      </View>

      {xpSeries && xpSeries.length > 0 ? (
        <XpSparkline
          values={xpSeries}
          days={xpDays}
          tone={isWorst ? 'warm' : 'good'}
          labels={[t('WeekdayShortFirst'), t('WeekdayShortLast')]}
          summary={t('XpLastDaysFor', { name: cat.name, count: xpSeries.length })}
          testID={`${testID}-sparkline`}
        />
      ) : (
        <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <View
            className={`h-full rounded-full ${isWorst ? 'bg-flame' : 'bg-success'}`}
            style={{ width: `${progress}%` }}
          />
        </View>
      )}
    </WidgetCard>
  );
}

export function BetterAreaWidget({ category, xpSeries, xpDays }: AreaWidgetProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  return (
    <AreaWidget
      category={category}
      xpSeries={xpSeries}
      xpDays={xpDays}
      title={t('Better Area')}
      icon={<ArrowUpRight size={14.5} color={theme.text3} />}
      variant="better"
      testID="widget-better-area"
    />
  );
}

/** Weakest category (less XP) — error bar. */
export function WorstAreaWidget({ category, xpSeries, xpDays }: AreaWidgetProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  return (
    <AreaWidget
      category={category}
      xpSeries={xpSeries}
      xpDays={xpDays}
      title={t('Worst Area')}
      icon={<Gauge size={14.5} color={theme.text3} />}
      variant="worst"
      testID="widget-worst-area"
    />
  );
}
