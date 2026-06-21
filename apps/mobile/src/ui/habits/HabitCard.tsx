import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { calculateLevelProgress } from '@beyou/state';
import type { habit } from '@beyou/types/habit/habitType';
import BeyouIcon from '../BeyouIcon';

interface HabitCardProps {
  habit: habit;
  onPress: (habit: habit) => void;
}

/**
 * Habit list card (mirrors the web habitBox): icon + name + description, category
 * chips, a level/XP progress bar, and the streak (constance). Tap to edit.
 */
export default function HabitCard({ habit, onPress }: HabitCardProps) {
  const { t } = useTranslation();
  const progress = calculateLevelProgress(habit.xp, habit.actualLevelXp, habit.nextLevelXp);

  return (
    <Pressable
      onPress={() => onPress(habit)}
      accessibilityRole="button"
      accessibilityLabel={habit.name}
      testID={`habit-card-${habit.id}`}
      className="rounded-2xl border border-primary/20 bg-background p-4"
    >
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <BeyouIcon id={habit.iconId} size={24} showFallback />
        </View>
        <View className="flex-1">
          <Text className="text-secondary text-base font-bold" numberOfLines={1}>
            {habit.name}
          </Text>
          {habit.description ? (
            <Text className="text-description text-sm" numberOfLines={1}>
              {habit.description}
            </Text>
          ) : null}
        </View>
        {habit.constance > 0 ? (
          <View className="flex-row items-center gap-1">
            <Text className="text-base">🔥</Text>
            <Text className="text-secondary text-sm font-semibold">{habit.constance}</Text>
          </View>
        ) : null}
      </View>

      {habit.categories?.length ? (
        <View className="mt-3 flex-row flex-wrap gap-1.5">
          {habit.categories.map((cat) => (
            <View key={cat.id} className="flex-row items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5">
              <BeyouIcon id={cat.iconId} size={12} />
              <Text className="text-primary text-xs">{cat.name}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View className="mt-3">
        <View className="mb-1 flex-row justify-between">
          <Text className="text-description text-xs">
            {t('Level')} {habit.level}
          </Text>
          <Text className="text-description text-xs">{progress}%</Text>
        </View>
        <View className="h-2 overflow-hidden rounded-full bg-primary/15">
          <View className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </View>
      </View>
    </Pressable>
  );
}
