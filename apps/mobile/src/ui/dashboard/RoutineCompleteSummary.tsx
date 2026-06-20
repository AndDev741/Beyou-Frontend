import { Text } from 'react-native';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { calculateRoutineXpToday } from '@beyou/state/dashboard/helpers';
import type { RootState } from '../../store';

/**
 * Shown once every routine item is checked (mirrors the web summary): celebrates
 * the day with total XP earned + current streak. Reads the checked/total synced
 * into the perfil slice by RoutineDay.
 */
export default function RoutineCompleteSummary() {
  const { t } = useTranslation();
  const checked = useSelector((s: RootState) => s.perfil.checkedItemsInScheduledRoutine);
  const total = useSelector((s: RootState) => s.perfil.totalItemsInScheduledRoutine);
  const constance = useSelector((s: RootState) => s.perfil.constance);
  const routine = useSelector((s: RootState) => s.todayRoutine.routine);

  if (total === 0 || checked < total) return null;

  const today = new Date().toJSON().slice(0, 10);
  const xpToday = calculateRoutineXpToday(routine, today);

  return (
    <Animated.View
      entering={FadeInDown.duration(280)}
      className="mt-3 w-full rounded-xl border border-primary/30 bg-primary/10 p-4"
      testID="routine-complete-summary"
    >
      <Text className="text-primary text-center text-lg font-bold">{t('RoutineCompleteTitle')}</Text>
      <Text className="text-secondary mt-1 text-center text-sm">
        {xpToday > 0
          ? t('RoutineCompleteMessage', { xp: xpToday, days: constance })
          : t('RoutineCompleteMessageNoXp', { days: constance })}
      </Text>
    </Animated.View>
  );
}
