import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { calculateLevelProgress } from '@beyou/state';
import type { habit } from '@beyou/types/habit/habitType';
import BeyouIcon from '../BeyouIcon';
import { useBeyouTheme } from '../../theme/ThemeProvider';
import { scaleColor, importanceKey, difficultyKey } from './levelLabels';

interface HabitCardProps {
  habit: habit;
  onEdit: (habit: habit) => void;
  onDelete: (habit: habit) => void;
}

function LevelBar({ habit }: { habit: habit }) {
  const { t } = useTranslation();
  const progress = calculateLevelProgress(habit.xp, habit.actualLevelXp, habit.nextLevelXp);
  return (
    <View>
      <View className="mb-1 flex-row justify-between">
        <Text className="text-description text-xs">
          {t('Level')} {habit.level}
        </Text>
        <Text className="text-description text-xs">
          {habit.xp}/{habit.nextLevelXp} xp
        </Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-primary/15">
        <View className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
      </View>
    </View>
  );
}

function ScaleRow({ label, value, phraseKey }: { label: string; value: number; phraseKey: string }) {
  const { t } = useTranslation();
  if (!phraseKey) return null;
  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-secondary text-sm font-semibold">{label}:</Text>
      <View className="h-3 w-3 rounded-full" style={{ backgroundColor: scaleColor(value) }} />
      <Text className="text-description text-sm">{t(phraseKey)}</Text>
    </View>
  );
}

/**
 * Habit list card (mirrors the web habitBox): collapsed shows icon + name +
 * description + level bar + streak; tapping the header expands to reveal full
 * description, categories, motivational phrase, importance/difficulty, and the
 * Edit/Delete actions — so viewing details never requires the edit form.
 */
export default function HabitCard({ habit, onEdit, onDelete }: HabitCardProps) {
  const { t } = useTranslation();
  const { theme } = useBeyouTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <View className="rounded-2xl border border-primary/20 bg-background p-4">
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        accessibilityRole="button"
        accessibilityLabel={habit.name}
        accessibilityState={{ expanded }}
        testID={`habit-card-${habit.id}`}
        className="flex-row items-center gap-3"
      >
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <BeyouIcon id={habit.iconId} size={24} showFallback />
        </View>
        <View className="flex-1">
          <Text className="text-secondary text-base font-bold" numberOfLines={expanded ? undefined : 1}>
            {habit.name}
          </Text>
          {habit.description ? (
            <Text className="text-description text-sm" numberOfLines={expanded ? undefined : 2}>
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
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.description} />
      </Pressable>

      {!expanded && habit.categories?.length ? (
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
        <LevelBar habit={habit} />
      </View>

      {expanded ? (
        <View className="mt-4 gap-3 border-t border-primary/10 pt-3">
          {habit.categories?.length ? (
            <View className="gap-1">
              <Text className="text-secondary text-sm font-semibold">{t('Categories')}</Text>
              <View className="flex-row flex-wrap gap-1.5">
                {habit.categories.map((cat) => (
                  <View key={cat.id} className="flex-row items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5">
                    <BeyouIcon id={cat.iconId} size={12} />
                    <Text className="text-primary text-xs">{cat.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {habit.motivationalPhrase ? (
            <View className="gap-0.5">
              <Text className="text-secondary text-sm font-semibold">{t('MotivationPhrase')}</Text>
              <Text className="text-description text-sm italic">"{habit.motivationalPhrase}"</Text>
            </View>
          ) : null}

          <ScaleRow label={t('Importance')} value={habit.importance} phraseKey={importanceKey(habit.importance)} />
          <ScaleRow label={t('Difficulty')} value={habit.dificulty} phraseKey={difficultyKey(habit.dificulty)} />

          <View className="mt-1 flex-row gap-3">
            <Pressable
              onPress={() => onEdit(habit)}
              accessibilityRole="button"
              testID={`habit-edit-${habit.id}`}
              className="flex-1 items-center rounded-lg bg-primary py-2.5"
            >
              <Text style={{ color: theme.background }} className="font-semibold">
                {t('Edit')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onDelete(habit)}
              accessibilityRole="button"
              testID={`habit-delete-${habit.id}`}
              className="flex-1 items-center rounded-lg border border-error py-2.5"
            >
              <Text className="text-error font-semibold">{t('Delete')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
