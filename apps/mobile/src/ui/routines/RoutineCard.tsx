import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { calculateLevelProgress } from '@beyou/state';
import type { Routine } from '@beyou/types/routine/routine';
import BeyouIcon from '../BeyouIcon';

interface RoutineCardProps {
  routine: Routine;
  onPress: (routine: Routine) => void;
}

export default function RoutineCard({ routine, onPress }: RoutineCardProps) {
  const { t } = useTranslation();
  const progress = calculateLevelProgress(routine.xp ?? 0, routine.actualLevelXp ?? 0, routine.nextLevelXp ?? 0);
  const sections = routine.routineSections?.length ?? 0;
  return (
    <Pressable
      onPress={() => onPress(routine)}
      accessibilityRole="button"
      accessibilityLabel={routine.name}
      testID={`routine-card-${routine.id}`}
      className="rounded-2xl border border-primary/20 bg-background p-4"
    >
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <BeyouIcon id={routine.iconId} size={24} showFallback />
        </View>
        <View className="flex-1">
          <Text className="text-secondary text-base font-bold" numberOfLines={1}>{routine.name}</Text>
          <Text className="text-description text-sm">{sections} {t('Sections')}</Text>
        </View>
      </View>
      <View className="mt-3">
        <View className="mb-1 flex-row justify-between">
          <Text className="text-description text-xs">{t('Level')} {routine.level ?? 0}</Text>
          <Text className="text-description text-xs">{progress}%</Text>
        </View>
        <View className="h-2 overflow-hidden rounded-full bg-primary/15">
          <View className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </View>
      </View>
    </Pressable>
  );
}
