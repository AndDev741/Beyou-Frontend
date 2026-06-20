import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { calculateLevelProgress } from '@beyou/state/dashboard/helpers';
import WidgetCard from './WidgetCard';

export interface LevelProgressWidgetProps {
  level: number;
  xp: number;
  nextLevelXp: number;
  actualLevelXp: number;
}

/** User level + XP-window progress bar — mirrors the web LevelProgress widget. */
export default function LevelProgressWidget({
  level,
  xp,
  nextLevelXp,
  actualLevelXp,
}: LevelProgressWidgetProps) {
  const { t } = useTranslation();
  const progress = calculateLevelProgress(xp, actualLevelXp, nextLevelXp);

  return (
    <WidgetCard title={t('Your life progress')} testID="widget-level-progress">
      <Text className="text-primary text-2xl font-bold">LV {level}</Text>

      <View
        className="bg-primary/10 mt-1 h-4 w-full overflow-hidden rounded-full border border-primary/30"
        testID="level-progress-track"
      >
        <View
          className="h-full rounded-full bg-primary"
          style={{ width: `${progress}%` }}
          testID="level-progress-fill"
        />
      </View>

      <View className="mt-1 w-full flex-row items-center justify-between">
        <Text className="text-description text-xs">{xp} XP</Text>
        <Text className="text-description text-xs">{nextLevelXp} XP</Text>
      </View>
    </WidgetCard>
  );
}
