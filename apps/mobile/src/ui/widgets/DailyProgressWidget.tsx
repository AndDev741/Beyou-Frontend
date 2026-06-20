import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import WidgetCard from './WidgetCard';
import ProgressRing from '../dashboard/ProgressRing';

export interface DailyProgressWidgetProps {
  checked: number;
  total: number;
}

const RING_SIZE = 88;

/**
 * Today's routine completion — phrase + task count on the left, a ProgressRing
 * on the right. Mirrors the web DailyProgress *mobile* layout (ring, not chart).
 */
export default function DailyProgressWidget({ checked, total }: DailyProgressWidgetProps) {
  const { t } = useTranslation();
  const progress = total > 0 ? (checked / total) * 100 : 0;

  return (
    <WidgetCard title={t('Daily Progress')} bigSize testID="widget-daily-progress">
      <View className="w-full flex-row items-center justify-between gap-3 px-1 py-1">
        <View className="flex-1">
          <Text className="text-primary text-sm font-semibold">{t('Daily progress phrase')}</Text>
          <Text className="text-secondary mt-1 text-lg font-semibold">
            {t('Tasks')}: {checked}/{total}
          </Text>
        </View>
        <View testID="daily-progress-ring">
          <ProgressRing progress={progress} size={RING_SIZE} centerLabel={`${checked}/${total}`} />
        </View>
      </View>
    </WidgetCard>
  );
}
