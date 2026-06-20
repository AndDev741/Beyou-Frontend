import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import type category from '@beyou/types/category/categoryType';
import { calculateLevelProgress } from '@beyou/state/dashboard/helpers';
import WidgetCard from './WidgetCard';
import BeyouIcon from '../BeyouIcon';

export interface AreaWidgetProps {
  category: category | null;
}

interface InnerProps extends AreaWidgetProps {
  title: string;
  /** "primary" (better) or "error" (worst) progress-bar color. */
  variant: 'primary' | 'error';
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

/** Shared body for the Better/Worst area widgets: icon + name + progress bar + level. */
function AreaWidget({ category, title, variant, testID }: InnerProps) {
  const cat = category ?? categoryExample;
  const progress = calculateLevelProgress(cat.xp, cat.actualLevelXp, cat.nextLevelXp);

  const fillClass = variant === 'error' ? 'bg-error' : 'bg-primary';
  const trackClass = variant === 'error' ? 'bg-error/10' : 'bg-primary/10';
  const borderClass = variant === 'error' ? 'border-error/30' : 'border-primary/30';

  return (
    <WidgetCard title={title} testID={testID}>
      <View className="w-full flex-row items-center justify-center">
        <BeyouIcon id={cat.iconId} size={24} />
        <Text
          className="text-primary ml-1 text-lg font-semibold"
          numberOfLines={1}
          testID={`${testID}-name`}
        >
          {cat.name}
        </Text>
      </View>

      <View className={`mt-1 h-4 w-full overflow-hidden rounded-full border ${borderClass} ${trackClass}`}>
        <View className={`h-full rounded-full ${fillClass}`} style={{ width: `${progress}%` }} />
      </View>

      <Text className="text-secondary mt-1">LV {cat.level}</Text>
    </WidgetCard>
  );
}

/** Strongest category (more XP) — primary bar. */
export function BetterAreaWidget({ category }: AreaWidgetProps) {
  const { t } = useTranslation();
  return (
    <AreaWidget
      category={category}
      title={t('Better Area')}
      variant="primary"
      testID="widget-better-area"
    />
  );
}

/** Weakest category (less XP) — error bar. */
export function WorstAreaWidget({ category }: AreaWidgetProps) {
  const { t } = useTranslation();
  return (
    <AreaWidget
      category={category}
      title={t('Worst Area')}
      variant="error"
      testID="widget-worst-area"
    />
  );
}
