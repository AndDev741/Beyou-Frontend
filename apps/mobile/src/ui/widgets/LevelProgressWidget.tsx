import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { calculateLevelProgress } from '@beyou/state/dashboard/helpers';
import { Award } from 'lucide-react-native';
import WidgetCard from './WidgetCard';
import { useBeyouTheme } from '../../theme/ThemeProvider';

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
  const { theme } = useBeyouTheme();
  const progress = calculateLevelProgress(xp, actualLevelXp, nextLevelXp);

  return (
    <WidgetCard
      title={`${t('Level')} ${level}`}
      icon={<Award size={14.5} color={theme.text3} />}
      testID="widget-level-progress"
    >
      <View
        className="mt-3 h-2 overflow-hidden rounded-[5px] bg-surface-2"
        testID="level-progress-track"
      >
        {/* No gradient: RN has no `bg-gradient-to-r` without an svg library for it.
            The solid accent reads the same in an 8px-tall block. */}
        <View
          className="h-full rounded-[5px] bg-accent"
          style={{ width: `${progress}%` }}
          testID="level-progress-fill"
        />
      </View>

      <View className="mt-[7px] flex-row items-center justify-between">
        <Text className="font-mono text-[11px] font-medium text-text-3">{`${xp} XP`}</Text>
        <Text className="font-mono text-[11px] font-medium text-text-3">{nextLevelXp}</Text>
      </View>
    </WidgetCard>
  );
}
